'use client';

import { useEffect, useState, useRef, use } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, Search, CheckCircle2, AlertTriangle, Lock, Users, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function GatekeeperDoorPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const supabase = createClient();

  const [event, setEvent] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);

  const [mode, setMode] = useState<'scan' | 'search'>('scan');
  const [guests, setGuests] = useState<any[]>([]);
  const guestsRef = useRef<any[]>([]);
useEffect(() => {
  guestsRef.current = guests;
}, [guests]);

  const [searchQuery, setSearchQuery] = useState('');
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'warning' | 'error'; guest?: any; msg: string } | null>(null);

  useEffect(() => {
    loadEventAndGuests();
  }, [eventId]);

  async function loadEventAndGuests() {
    const [{ data: ev }, { data: gst }] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('guests').select('*').eq('event_id', eventId).neq('status', 'replaced'),
    ]);
    setEvent(ev);
    setGuests(gst || []);
  }

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (event && pinInput === (event.gatekeeper_pin || '1234')) {
      setUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  }
useEffect(() => {
  if (!unlocked || mode !== 'scan') return;
  const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: { width: 230, height: 230 } }, false);
  scanner.render(async (decodedToken) => {
    await handleTokenCheckIn(decodedToken.trim());
  }, () => {});
  return () => { scanner.clear().catch(() => {}); };
}, [unlocked, mode]);

async function handleTokenCheckIn(token: string) {
  const guest = guestsRef.current.find((g) => g.invite_token === token);
  if (!guest) {
    setScanResult({ type: 'error', msg: 'Invalid QR Pass — Not found on this guest list.' });
    return;
  }
  const maxAllowed = 1 + (guest.extra_guests || 0);
  if (guest.arrived_count >= maxAllowed) {
    setScanResult({ type: 'warning', guest, msg: `Already Checked In (${guest.arrived_count}/${maxAllowed} arrived).` });
    return;
  }
  await markArrived(guest, maxAllowed);
}


  async function markArrived(guest: any, newCount: number) {
    setCheckingInId(guest.id);
    const { data, error } = await supabase
      .from('guests')
      .update({
        arrived_count: newCount,
        status: guest.status === 'pending' || guest.status === 'draft' ? 'accepted' : guest.status,
        last_checked_in_at: new Date().toISOString(),
      })
      .eq('id', guest.id)
      .select()
      .single();

    setCheckingInId(null);
    if (!error && data) {
      setGuests((prev) => prev.map((g) => (g.id === data.id ? data : g)));
      setScanResult({
        type: 'success',
        guest: data,
        msg: `Checked in ${data.full_name} (${newCount} of ${1 + (data.extra_guests || 0)} guests).`,
      });
    }
  }
  if (!event) {
    return (
      <div className="min-h-screen bg-[#1C1917] text-white flex items-center justify-center gap-2 text-sm">
        <Loader2 className="w-4 h-4 animate-spin text-[#B48A5A]" /> Loading Gatekeeper...
      </div>
    );
  }

  if (!unlocked) {
    return (
      <main className="min-h-screen bg-[#1C1917] text-[#FAF8F5] flex items-center justify-center p-6">
        <form onSubmit={handleUnlock} className="w-full max-w-xs bg-stone-900 border border-stone-800 p-6 rounded-2xl text-center space-y-4">
          <Lock className="w-7 h-7 mx-auto text-[#B48A5A]" />
          <div>
            <h1 className="text-lg font-bold">{event.title}</h1>
            <p className="text-xs text-stone-400 mt-1">Enter Gatekeeper PIN (default: 1234)</p>
          </div>
          {pinError && <p className="text-xs text-red-400">Incorrect PIN. Try again.</p>}
          <input
            type="password"
            maxLength={6}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="••••"
            className="w-full text-center tracking-[0.5em] text-xl font-bold bg-stone-800 border border-stone-700 rounded-xl py-3"
          />
          <button type="submit" className="w-full bg-[#2E5A44] text-white font-semibold py-3 rounded-xl text-sm">
            Unlock Door Scanner
          </button>
        </form>
      </main>
    );
  }

  const totalArrived = guests.reduce((s, g) => s + (g.arrived_count || 0), 0);
  const filtered = guests.filter(
    (g) =>
      g.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.phone_number.includes(searchQuery)
  );

  return (
    <main className="min-h-screen bg-[#1C1917] text-[#FAF8F5] pb-16">
      <header className="border-b border-stone-800 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#B48A5A]">Door Check-In</p>
          <h1 className="font-bold text-base truncate">{event.title}</h1>
        </div>
        <div className="bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-[#2E5A44]" /> {totalArrived} Arrived
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 pt-5 space-y-5">
        <div className="grid grid-cols-2 gap-2 bg-stone-900 p-1 rounded-xl border border-stone-800">
          <button
            onClick={() => { setMode('scan'); setScanResult(null); }}
            className={`py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
              mode === 'scan' ? 'bg-[#2E5A44] text-white' : 'text-stone-400'
            }`}
          >
            <QrCode className="w-4 h-4" /> Scan QR Pass
          </button>
          <button
            onClick={() => { setMode('search'); setScanResult(null); }}
            className={`py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
              mode === 'search' ? 'bg-[#2E5A44] text-white' : 'text-stone-400'
            }`}
          >
            <Search className="w-4 h-4" /> Search Name
          </button>
        </div>

        {scanResult && (
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              scanResult.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                : scanResult.type === 'warning'
                ? 'bg-amber-950/80 border-amber-500/40 text-amber-200'
                : 'bg-red-950/80 border-red-500/40 text-red-200'
            }`}
          >
            {scanResult.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            )}
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm">{scanResult.msg}</p>
              {scanResult.guest && (
                <p className="opacity-80">
                  Allowance: {scanResult.guest.full_name} + {scanResult.guest.extra_guests || 0}
                </p>
              )}
            </div>
          </div>
        )}

        {mode === 'scan' ? (
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 overflow-hidden">
            <div id="qr-reader" className="w-full" />
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Type guest name or phone digits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white"
            />
            <div className="divide-y divide-stone-800 bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden">
              {filtered.map((g) => {
                const maxAllowed = 1 + (g.extra_guests || 0);
                const fullyArrived = g.arrived_count >= maxAllowed;
                return (
                  <div key={g.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{g.full_name}</p>
                      <p className="text-xs text-stone-400">
                        Admits {maxAllowed} • Arrived: {g.arrived_count || 0}/{maxAllowed}
                      </p>
                    </div>
                    <button
                      disabled={fullyArrived || checkingInId === g.id}
                      onClick={() => markArrived(g, maxAllowed)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                        fullyArrived
                          ? 'bg-stone-800 text-stone-500'
                          : 'bg-[#2E5A44] text-white'
                      }`}
                    >
                      {checkingInId === g.id && <Loader2 className="w-3 h-3 animate-spin" />}
                      {fullyArrived ? 'Attended' : 'Mark Attended'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
