'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import {
  Users, Calendar, Trash2, ShieldCheck, ArrowLeft, ArrowRight,
  Loader2, Globe, UserPlus, Ban, CheckCircle2, KeyRound, Search, SlidersHorizontal,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [tab, setTab] = useState<'hosts' | 'events'>('hosts');
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [creating, setCreating] = useState(false);
  const isAr = lang === 'ar';

  const loadData = useCallback(async (email: string) => {
    const res = await fetch('/api/admin/users', { headers: { 'x-admin-email': email } });
    const data = await res.json();
    setUsers(data.users || []);
    setEvents(data.events || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      const allowed = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase();
      if (!user || !allowed || user.email?.toLowerCase() !== allowed) {
        router.replace('/');
        return;
      }
      setAdminEmail(user.email!);
      await loadData(user.email!);
    }
    init();
  }, [router, supabase, loadData]);
  async function handleCreateHost(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-email': adminEmail },
      body: JSON.stringify({ email: newEmail, password: newPassword, guest_limit: newLimit || null }),
    });
    setCreating(false);
    if (res.ok) {
      setShowAddModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewLimit('');
      await loadData(adminEmail);
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to create host');
    }
  }

  async function handleToggleBan(userId: string) {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-email': adminEmail },
      body: JSON.stringify({ userId, action: 'toggle_ban' }),
    });
    if (res.ok) {
      const { banned } = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, banned } : u)));
    }
  }

  async function handleResetPassword(userId: string, email: string) {
    const newPassword = prompt(isAr ? `كلمة المرور الجديدة لـ "${email}":` : `New password for "${email}":`);
    if (!newPassword) return;
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-email': adminEmail },
      body: JSON.stringify({ userId, action: 'reset_password', newPassword }),
    });
    alert(res.ok ? (isAr ? 'تم التحديث.' : 'Updated.') : 'Error');
  }

  async function handleSetLimit(userId: string, email: string, currentLimit: number | null) {
    const input = prompt(isAr ? `حد الضيوف لـ "${email}" (فارغ = غير محدود):` : `Guest quota for "${email}":`, currentLimit ? String(currentLimit) : '');
    if (input === null) return;
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-email': adminEmail },
      body: JSON.stringify({ userId, action: 'set_limit', guestLimit: input.trim() }),
    });
    if (res.ok) {
      const { guest_limit } = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, guest_limit } : u)));
    }
  }

  async function handleDeleteUser(userId: string, email: string) {
    if (!confirm(isAr ? `حذف "${email}"؟` : `Delete "${email}"?`)) return;
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-email': adminEmail },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  async function handleDeleteEvent(eventId: string, title: string) {
    if (!confirm(isAr ? `حذف "${title}"؟` : `Delete "${title}"?`)) return;
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-email': adminEmail },
      body: JSON.stringify({ eventId }),
    });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      await loadData(adminEmail);
    }
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#2E5A44]" />
      </div>
    );
  }

  const filteredUsers = users.filter((u) => u.email?.toLowerCase().includes(search.toLowerCase()));
  const filteredEvents = events.filter((e) => e.title?.toLowerCase().includes(search.toLowerCase()) || e.host_email?.toLowerCase().includes(search.toLowerCase()));
  const totalEvents = users.reduce((sum, u) => sum + u.events_count, 0);
  const totalGuests = users.reduce((sum, u) => sum + u.guests_count, 0);

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen bg-[#FAF8F5] text-stone-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2E5A44] text-white flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
            <div>
              <h1 className="text-xl font-bold">{isAr ? 'لوحة تحكم إدارة حيّاك' : '7yak Platform Admin'}</h1>
              <p className="text-xs text-stone-500">{isAr ? 'إدارة المضيفين والباقات والمناسبات' : 'Manage hosts, quotas & events'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#2E5A44] text-white px-3.5 py-2 rounded-xl">
              <UserPlus className="w-3.5 h-3.5" /> {isAr ? 'إضافة مضيف' : 'Add Host'}
            </button>
            <button onClick={() => setLang(isAr ? 'en' : 'ar')} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-stone-200 px-3.5 py-2 rounded-xl">
              <Globe className="w-3.5 h-3.5 text-[#2E5A44]" /> {isAr ? 'English' : 'عربي'}
            </button>
            <button onClick={() => router.push('/')} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-stone-200 px-3.5 py-2 rounded-xl">
              {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />} {isAr ? 'لوحة المضيف' : 'Host'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className="text-xs text-stone-500 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {isAr ? 'المضيفون' : 'Hosts'}</p>
            <p className="text-2xl font-bold mt-1">{users.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className="text-xs text-stone-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {isAr ? 'المناسبات' : 'Events'}</p>
            <p className="text-2xl font-bold mt-1">{totalEvents}</p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <p className="text-xs text-stone-500 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {isAr ? 'المدعوون' : 'Guests'}</p>
            <p className="text-2xl font-bold mt-1">{totalGuests}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex bg-white border border-stone-200 rounded-xl p-1">
            <button onClick={() => setTab('hosts')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold ${tab === 'hosts' ? 'bg-[#2E5A44] text-white' : 'text-stone-600'}`}>
              {isAr ? `المضيفون (${users.length})` : `Hosts (${users.length})`}
            </button>
            <button onClick={() => setTab('events')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold ${tab === 'events' ? 'bg-[#2E5A44] text-white' : 'text-stone-600'}`}>
              {isAr ? `المناسبات (${events.length})` : `Events (${events.length})`}
            </button>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className={`w-4 h-4 text-stone-400 absolute top-2.5 ${isAr ? 'right-3' : 'left-3'}`} />
            <input type="text" placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={(e) => setSearch(e.target.value)} className={`w-full bg-white border border-stone-200 rounded-xl py-2 text-xs ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'}`} />
          </div>
        </div>
        {tab === 'hosts' ? (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-x-auto">
            <table className={`w-full text-sm ${isAr ? 'text-right' : 'text-left'}`}>
              <thead className="bg-stone-50 border-b border-stone-200 text-xs text-stone-500">
                <tr>
                  <th className="py-3 px-4">{isAr ? 'المضيف' : 'Email'}</th>
                  <th className="py-3 px-4">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-4">{isAr ? 'المناسبات' : 'Events'}</th>
                  <th className="py-3 px-4">{isAr ? 'الضيوف / الباقة' : 'Guests / Quota'}</th>
                  <th className={`py-3 px-4 ${isAr ? 'text-left' : 'text-right'}`}>{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredUsers.map((u) => {
                  const isSelf = u.email?.toLowerCase() === adminEmail.toLowerCase();
                  return (
                    <tr key={u.id}>
                      <td className="py-3 px-4 font-medium">{u.email}</td>
                      <td className="py-3 px-4">
                        {u.banned ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full"><Ban className="w-3 h-3" /> {isAr ? 'موقوف' : 'Suspended'}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2E5A44] bg-[#2E5A44]/10 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> {isAr ? 'نشط' : 'Active'}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">{u.events_count}</td>
                      <td className="py-3 px-4">{u.guests_count} / <span className="text-xs text-stone-500">{u.guest_limit || (isAr ? 'غير محدود' : 'Unlimited')}</span></td>
                      <td className={`py-3 px-4 ${isAr ? 'text-left' : 'text-right'}`}>
                        <div className="inline-flex items-center gap-1.5">
                          <button onClick={() => handleSetLimit(u.id, u.email, u.guest_limit)} className="inline-flex items-center gap-1 text-xs font-semibold bg-stone-100 px-2.5 py-1.5 rounded-lg"><SlidersHorizontal className="w-3.5 h-3.5" /> {isAr ? 'الباقة' : 'Quota'}</button>
                          <button onClick={() => handleResetPassword(u.id, u.email)} className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg"><KeyRound className="w-3.5 h-3.5" /> {isAr ? 'كلمة المرور' : 'Password'}</button>
                          {!isSelf && (
                            <>
                              <button onClick={() => handleToggleBan(u.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-50 px-2.5 py-1.5 rounded-lg"><Ban className="w-3.5 h-3.5" /> {u.banned ? (isAr ? 'تفعيل' : 'Activate') : (isAr ? 'إيقاف' : 'Suspend')}</button>
                              <button onClick={() => handleDeleteUser(u.id, u.email)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg"><Trash2 className="w-3.5 h-3.5" /> {isAr ? 'حذف' : 'Delete'}</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-x-auto">
            <table className={`w-full text-sm ${isAr ? 'text-right' : 'text-left'}`}>
              <thead className="bg-stone-50 border-b border-stone-200 text-xs text-stone-500">
                <tr>
                  <th className="py-3 px-4">{isAr ? 'المناسبة' : 'Event'}</th>
                  <th className="py-3 px-4">{isAr ? 'المضيف' : 'Host'}</th>
                  <th className="py-3 px-4">{isAr ? 'الضيوف' : 'Guests'}</th>
                  <th className={`py-3 px-4 ${isAr ? 'text-left' : 'text-right'}`}>{isAr ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td className="py-3 px-4 font-medium">{ev.title}</td>
                    <td className="py-3 px-4 text-xs text-stone-600">{ev.host_email}</td>
                    <td className="py-3 px-4">{ev.guests_count}</td>
                    <td className={`py-3 px-4 ${isAr ? 'text-left' : 'text-right'}`}>
                      <button onClick={() => handleDeleteEvent(ev.id, ev.title)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg"><Trash2 className="w-3.5 h-3.5" /> {isAr ? 'حذف' : 'Delete'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateHost} className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold">{isAr ? 'إنشاء حساب مضيف' : 'Create Host'}</h2>
            <input type="email" required placeholder={isAr ? 'البريد الإلكتروني' : 'Email'} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm" />
            <input type="password" required minLength={6} placeholder={isAr ? 'كلمة المرور' : 'Password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm" />
            <input type="number" min={1} placeholder={isAr ? 'حد الضيوف (اختياري)' : 'Guest quota (optional)'} value={newLimit} onChange={(e) => setNewLimit(e.target.value)} className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-xs font-semibold text-stone-600">{isAr ? 'إلغاء' : 'Cancel'}</button>
              <button type="submit" disabled={creating} className="px-4 py-2 text-xs font-semibold bg-[#2E5A44] text-white rounded-xl">{isAr ? 'إنشاء' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
