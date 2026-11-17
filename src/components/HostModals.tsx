'use client';

import { useState } from 'react';
import { Upload, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export function formatKuwaitPhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 8) return `+965${digits}`;
  if (digits.startsWith('00965')) return `+${digits.slice(2)}`;
  if (digits.startsWith('965') && digits.length === 11) return `+${digits}`;
  return raw.startsWith('+') ? raw : `+${digits}`;
}

export function NewEventModal({
  user,
  onClose,
  onCreated,
}: {
  user: any;
  onClose: () => void;
  onCreated: () => void;
}) {
  const supabase = createClient();
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [locationName, setLocationName] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [inviteFile, setInviteFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    let imageUrl = '';
    if (inviteFile) {
      const ext = inviteFile.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('invitations').upload(path, inviteFile);
      if (uploadErr) {
        alert(`Image upload error: ${uploadErr.message}`);
      } else {
        const { data: pub } = supabase.storage.from('invitations').getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }
    }

    const { error } = await supabase.from('events').insert({
      host_id: user.id,
      title,
      event_date: new Date(eventDate).toISOString(),
      location_name: locationName,
      maps_url: mapsUrl,
      custom_message: customMessage,
      invitation_image_url: imageUrl,
    });

    setSaving(false);
    if (error) {
      alert(`Error creating event: ${error.message}`);
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3">
        <h2 className="text-lg font-bold">Create New Gathering</h2>
        <input required placeholder="Event Title (e.g. Al-Sabah Reception)" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" />
        <input required type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" />
        <input required placeholder="Venue / Area (e.g. Four Seasons Kuwait)" value={locationName} onChange={(e) => setLocationName(e.target.value)} className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" />
        <input placeholder="Google Maps Link (optional)" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" />
        <textarea rows={2} placeholder="Invitation message..." value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 text-xs font-semibold text-stone-600 border border-dashed border-stone-300 rounded-xl p-3 cursor-pointer">
          <Upload className="w-4 h-4 text-[#B48A5A]" />
          <span>{inviteFile ? inviteFile.name : 'Upload Invitation Image (JPG/PNG)'}</span>
<input type="file" accept="image/*" className="hidden" onChange={(e) => setInviteFile(e.target.files?.[0] || null)} />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-stone-500">Cancel</button>
          <button type="submit" disabled={saving} className="bg-[#2E5A44] text-white px-4 py-2 rounded-xl text-xs font-semibold">
            {saving ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
export function ImportGuestsModal({
  eventId,
  collections,
  onClose,
  onSaved,
}: {
  eventId: string;
  collections: any[];
  onClose: () => void;
  onSaved: (newGuests: any[]) => void;
}) {
  const supabase = createClient();
  const [pasteText, setPasteText] = useState('');
  const [draftGuests, setDraftGuests] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Parse .vcf (vCard) files exported from iPhone or Android Contacts
  async function handleVcfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const cards = text.split('END:VCARD');
    const parsed: any[] = [];

    for (const card of cards) {
      const fnMatch = card.match(/FN[^:]*:(.*)/i);
      const telMatch = card.match(/TEL[^:]*:(.*)/i);
      if (fnMatch && telMatch) {
        parsed.push({
          full_name: fnMatch[1].trim(),
          phone_number: formatKuwaitPhone(telMatch[1].trim()),
          extra_guests: 0,
          collection_id: collections[0]?.id || '',
        });
      }
    }
    if (parsed.length === 0) {
      alert('No valid contacts with phone numbers found in that file.');
      return;
    }
    setDraftGuests((prev) => [...prev, ...parsed]);
  }

  function handleParsePaste() {
    const lines = pasteText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed = lines.map((line) => {
      const match = line.match(/([+0-9\s-]{8,})$/);
      const rawPhone = match ? match[1] : '';
      const rawName = match ? line.replace(match[1], '').replace(/[,-]+$/, '').trim() : line;
      return {
        full_name: rawName || 'Guest',
        phone_number: formatKuwaitPhone(rawPhone),
        extra_guests: 0,
        collection_id: collections[0]?.id || '',
      };
    });
    setDraftGuests((prev) => [...prev, ...parsed]);
    setPasteText('');
  }

  async function handleSave() {
    if (draftGuests.length === 0) return;
    setSaving(true);

    const seen = new Set<string>();
    const uniqueDrafts = draftGuests.filter((g) => {
      const clean = formatKuwaitPhone(g.phone_number);
      if (seen.has(clean)) return false;
      seen.add(clean);
      return true;
    });

    const payload = uniqueDrafts.map((g) => ({
      event_id: eventId,
      collection_id: g.collection_id || null,
      full_name: g.full_name,
      phone_number: formatKuwaitPhone(g.phone_number),
      extra_guests: Number(g.extra_guests) || 0,
      status: 'draft',
    }));

    const { data, error } = await supabase.from('guests').insert(payload).select();
    setSaving(false);

    if (error) {
      alert(error.code === '23505' ? 'One or more numbers are already invited.' : `Error: ${error.message}`);
      return;
    }
    if (data) {
      onSaved(data);
      onClose();
    }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-bold">Add or Import Guests</h2>

        <label className="w-full bg-[#FAF8F5] border-2 border-dashed border-[#2E5A44]/40 text-[#2E5A44] font-semibold py-3.5 px-4 rounded-xl text-sm flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-[#2E5A44]/5 transition">
          <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Import Contact File (.vcf)</span>
          <span className="text-[11px] font-normal text-stone-500">Works on iPhone &amp; Android (Export contacts from Contacts app)</span>
          <input type="file" accept=".vcf,text/vcard" className="hidden" onChange={handleVcfUpload} />
        </label>

        <div className="space-y-2">
          <textarea
            rows={3}
            placeholder={'Or paste names & numbers (one per line):\nAhmed Al-Sabah 99123456\nNora Al-Mutairi 66554433'}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            className="w-full rounded-xl border border-stone-200 p-3 text-xs"
          />
          <button type="button" onClick={handleParsePaste} className="bg-stone-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl">
            Add Lines to Review List
          </button>
        </div>

        {draftGuests.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-semibold text-stone-500">Edit formal names, family group &amp; +1s before saving:</p>
            {draftGuests.map((dg, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-[#FAF8F5] p-2 rounded-xl">
                <input value={dg.full_name} onChange={(e) => { const c = [...draftGuests]; c[idx].full_name = e.target.value; setDraftGuests(c); }} className="col-span-4 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs" />
                <input value={dg.phone_number} onChange={(e) => { const c = [...draftGuests]; c[idx].phone_number = e.target.value; setDraftGuests(c); }} className="col-span-3 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs" />
                <select value={dg.collection_id} onChange={(e) => { const c = [...draftGuests]; c[idx].collection_id = e.target.value; setDraftGuests(c); }} className="col-span-3 rounded-lg border border-stone-200 bg-white px-1.5 py-1.5 text-xs">
                  <option value="">No Group</option>
                  {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={dg.extra_guests} onChange={(e) => { const c = [...draftGuests]; c[idx].extra_guests = Number(e.target.value); setDraftGuests(c); }} className="col-span-2 rounded-lg border border-stone-200 bg-white px-1 py-1.5 text-xs">
                  <option value={0}>Solo</option>
                  <option value={1}>+1</option>
                  <option value={2}>+2</option>
                  <option value={3}>+3</option>
                </select>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-stone-500">Close</button>
          {draftGuests.length > 0 && (
            <button type="button" disabled={saving} onClick={handleSave} className="bg-[#2E5A44] text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50">
              {saving ? 'Saving Guests...' : `Save ${draftGuests.length} Guests`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


export function ReplaceGuestModal({
  guest,
  eventId,
  onClose,
  onReplaced,
}: {
  guest: any;
  eventId: string;
  onClose: () => void;
  onReplaced: () => void;
}) {
  const supabase = createClient();
  const [replaceName, setReplaceName] = useState('');
  const [replacePhone, setReplacePhone] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { data: newGuest, error } = await supabase
      .from('guests')
      .insert({
        event_id: eventId,
        collection_id: guest.collection_id,
        full_name: replaceName,
        phone_number: formatKuwaitPhone(replacePhone),
        extra_guests: guest.extra_guests,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      alert(`Error replacing guest: ${error.message}`);
      return;
    }
    if (newGuest) {
      await supabase
        .from('guests')
        .update({ status: 'replaced', replaced_by_guest_id: newGuest.id })
        .eq('id', guest.id);
      onReplaced();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-3">
        <h2 className="text-base font-bold">Replace {guest.full_name}</h2>
        <p className="text-xs text-stone-500">
          Archives {guest.full_name}&apos;s declined invite and creates a fresh invite with +{guest.extra_guests} allowance.
        </p>
        <input required placeholder="New Guest Formal Name" value={replaceName} onChange={(e) => setReplaceName(e.target.value)} className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" />
        <input required placeholder="Phone Number (e.g. 99123456)" value={replacePhone} onChange={(e) => setReplacePhone(e.target.value)} className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-xs font-semibold text-stone-500">Cancel</button>
          <button type="submit" className="bg-[#2E5A44] text-white px-4 py-2 rounded-xl text-xs font-semibold">Confirm Replacement</button>
        </div>
      </form>
    </div>
  );
}
export function CopyFromEventModal({
  currentEventId,
  events,
  targetCollections,
  isAr,
  onClose,
  onCopied,
}: {
  currentEventId: string;
  events: any[];
  targetCollections: any[];
  isAr: boolean;
  onClose: () => void;
  onCopied: (newGuests: any[]) => void;
}) {
  const supabase = createClient();
  const otherEvents = events.filter((e) => e.id !== currentEventId);

const [sourceEventId, setSourceEventId] = useState(otherEvents?.[0]?.id || '');
  const [sourceGuests, setSourceGuests] = useState<any[]>([]);
  const [sourceCollections, setSourceCollections] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetCollectionId, setTargetCollectionId] = useState('');
  const [loadingSource, setLoadingSource] = useState(false);
  const [copying, setCopying] = useState(false);

  async function loadSourceEvent(evId: string) {
    setSourceEventId(evId);
    if (!evId) return;
    setLoadingSource(true);
    const [{ data: gst }, { data: cols }] = await Promise.all([
      supabase.from('guests').select('*').eq('event_id', evId).neq('status', 'replaced'),
      supabase.from('collections').select('*').eq('event_id', evId),
    ]);
    const list = gst || [];
    setSourceGuests(list);
    setSourceCollections(cols || []);
    setSelectedIds(new Set(list.map((g) => g.id)));
    setLoadingSource(false);
  }

  // Load initial source event on mount
useState(() => {
  if (otherEvents?.[0]?.id) loadSourceEvent(otherEvents[0].id);
});

  function toggleGuest(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function selectByGroup(colId: string) {
    const groupGuestIds = sourceGuests
      .filter((g) => (colId === 'all' ? true : g.collection_id === colId))
      .map((g) => g.id);
    setSelectedIds(new Set(groupGuestIds));
  }

  async function handleCopy() {
    const chosen = sourceGuests.filter((g) => selectedIds.has(g.id));
    if (chosen.length === 0) return;

    setCopying(true);

    // 1. Check which phone numbers are already in the target event
    const { data: existing } = await supabase
      .from('guests')
      .select('phone_number')
      .eq('event_id', currentEventId)
      .neq('status', 'replaced');

    const existingPhones = new Set((existing || []).map((e) => e.phone_number));
    const freshGuests = chosen.filter((g) => !existingPhones.has(g.phone_number));

    if (freshGuests.length === 0) {
      setCopying(false);
      alert(isAr ? 'جميع الضيوف المختارين موجودون بالفعل في هذه المناسبة.' : 'All selected guests are already in this event.');
      onClose();
      return;
    }

    // 2. Insert only the non-duplicate guests
    const payload = freshGuests.map((g) => ({
      event_id: currentEventId,
      collection_id: targetCollectionId || null,
      full_name: g.full_name,
      phone_number: g.phone_number,
      extra_guests: g.extra_guests || 0,
      status: 'draft',
    }));

    const { data, error } = await supabase.from('guests').insert(payload).select();
    setCopying(false);

    if (error) {
      alert(`Error copying guests: ${error.message}`);
      return;
    }
    onCopied(data || []);
    onClose();
  }


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div dir={isAr ? 'rtl' : 'ltr'} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-bold">
          {isAr ? 'نسخ ضيوف من مناسبة أخرى' : 'Copy Guests from Another Event'}
        </h2>

        {otherEvents.length === 0 ? (
          <p className="text-xs text-stone-500 py-4">
            {isAr
              ? 'لا توجد مناسبات أخرى لنسخ الضيوف منها.'
              : 'You need at least two events to copy guests between them.'}
          </p>
        ) : (
          <>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-600">
                {isAr ? 'اختر المناسبة المصدر:' : 'Select Source Event:'}
              </label>
              <select
                value={sourceEventId}
                onChange={(e) => loadSourceEvent(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] px-3 py-2 text-sm font-medium"
              >
                {otherEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>

            {sourceCollections.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-stone-400">
                  {isAr ? 'تحديد سريع:' : 'Quick select:'}
                </span>
                <button
                  type="button"
                  onClick={() => selectByGroup('all')}
                  className="text-[11px] bg-stone-100 px-2.5 py-1 rounded-full font-semibold"
                >
                  {isAr ? 'الكل' : 'All'} ({sourceGuests.length})
                </button>
                {sourceCollections.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectByGroup(c.id)}
                    className="text-[11px] bg-[#FAF8F5] border border-stone-200 px-2.5 py-1 rounded-full font-semibold"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 max-h-52 overflow-y-auto">
              {loadingSource ? (
                <p className="p-4 text-xs text-stone-400 text-center">Loading guests...</p>
              ) : sourceGuests.length === 0 ? (
                <p className="p-4 text-xs text-stone-400 text-center">No guests in this event.</p>
              ) : (
                sourceGuests.map((g) => (
                  <label key={g.id} className="p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#FAF8F5]">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(g.id)}
                        onChange={() => toggleGuest(g.id)}
                        className="rounded text-[#2E5A44]"
                      />
                      <div>
                        <p className="text-xs font-semibold">{g.full_name}</p>
                        <p className="text-[11px] text-stone-400" dir="ltr">{g.phone_number}</p>
                      </div>
                    </div>
                    {g.extra_guests > 0 && (
                      <span className="text-[11px] font-bold text-[#2E5A44]">+{g.extra_guests}</span>
                    )}
                  </label>
                ))
              )}
            </div>

            {targetCollections.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600">
                  {isAr ? 'إضافتهم إلى مجموعة في هذه المناسبة (اختياري):' : 'Assign to group in this event (optional):'}
                </label>
                <select
                  value={targetCollectionId}
                  onChange={(e) => setTargetCollectionId(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] px-3 py-2 text-xs"
                >
                  <option value="">{isAr ? 'عام / غير مصنف' : 'General / Unassigned'}</option>
                  {targetCollections.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-stone-500">
            {isAr ? 'إغلاق' : 'Close'}
          </button>
          {otherEvents.length > 0 && selectedIds.size > 0 && (
            <button
              type="button"
              disabled={copying}
              onClick={handleCopy}
              className="bg-[#2E5A44] text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              {copying
                ? isAr ? 'جاري النسخ...' : 'Copying...'
                : isAr
                ? `نسخ ${selectedIds.size} ضيوف`
                : `Copy ${selectedIds.size} Guests`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
