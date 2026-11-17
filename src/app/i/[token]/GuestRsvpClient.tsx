'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Calendar, MapPin, Check, X, Users, Sparkles, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase';

const COPY = {
  en: {
    cordiallyInvited: 'You Are Cordially Invited',
    personalInviteFor: 'Personal Invitation For',
    plusGuests: (n: number) => `+ ${n} ${n === 1 ? 'Guest' : 'Guests'}`,
    openMaps: 'Open in Google Maps',
    notePlaceholder: 'Add a short note or blessing for the host (optional)...',
    acceptBtn: 'Accept Invite',
    declineBtn: 'Decline',
    saving: 'Saving...',
    passTitle: 'Personal Entry Pass',
    admits: (n: number) => `Admits ${n} (${n === 1 ? 'You' : `You + ${n - 1}`})`,
    scanHint: 'Present this QR code at the entrance',
    declinedMsg: 'Thank you for letting us know. We have notified the host.',
    changeResponse: 'Change Response',
    switchLang: 'عربي',
  },
  ar: {
    cordiallyInvited: 'يسرّنا دعوتكم لحضور',
    personalInviteFor: 'دعوة خاصة إلى',
    plusGuests: (n: number) => `+ ${n} ${n === 1 ? 'مرافق' : 'مرافقين'}`,
    openMaps: 'فتح الموقع في خرائط جوجل',
    notePlaceholder: 'أضف تهنئة أو ملاحظة قصيرة للمضيف (اختياري)...',
    acceptBtn: 'قبول الدعوة',
    declineBtn: 'اعتذار',
    saving: 'جاري الحفظ...',
    passTitle: 'بطاقة الدخول الشخصية',
    admits: (n: number) => `الدخول لعدد ${n} (${n === 1 ? 'شخص واحد' : `أنت + ${n - 1}`})`,
    scanHint: 'يرجى إبراز رمز الدخول عند البوابة',
    declinedMsg: 'شكراً لإبلاغنا، تم إشعار المضيف بردّكم.',
    changeResponse: 'تعديل الرد',
    switchLang: 'English',
  },
};

export default function GuestRsvpClient({ initialGuest, event }: { initialGuest: any; event: any }) {
  const supabase = createClient();
  const [lang, setLang] = useState<'en' | 'ar'>('ar');
  const [status, setStatus] = useState<string>(initialGuest.status);
  const [note, setNote] = useState<string>(initialGuest.guest_note || '');
  const [loading, setLoading] = useState(false);

  const t = COPY[lang];
  const isAr = lang === 'ar';
  const totalHeadcount = 1 + (initialGuest.extra_guests || 0);

  async function handleResponse(newStatus: 'accepted' | 'declined') {
    setLoading(true);
    const { error } = await supabase
      .from('guests')
      .update({ status: newStatus, guest_note: note.trim() || null })
      .eq('id', initialGuest.id);

    setLoading(false);
    if (!error) {
      setStatus(newStatus);
    } else {
      alert('Could not update RSVP. Please try again.');
    }
  }
  return (
    <main
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#FAF8F5] text-[#1C1917] flex flex-col items-center py-8 px-4"
    >
      <div className="w-full max-w-md space-y-6">
        {/* Language Toggle Pill */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setLang(isAr ? 'en' : 'ar')}
            className="inline-flex items-center gap-1.5 bg-white border border-stone-200 px-3.5 py-1.5 rounded-full text-xs font-semibold text-stone-700 shadow-xs hover:border-[#B48A5A] transition"
          >
            <Globe className="w-3.5 h-3.5 text-[#B48A5A]" />
            <span>{t.switchLang}</span>
          </button>
        </div>

        {/* Invitation Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 overflow-hidden">
          {event.invitation_image_url && (
            <img
              src={event.invitation_image_url}
              alt={event.title}
              className="w-full h-auto object-cover max-h-[420px]"
            />
          )}

          <div className="p-6 text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#B48A5A] font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.cordiallyInvited}</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#1C1917]">
              {event.title}
            </h1>

            {/* Personalized Guest Greeting & Fixed Allowance Badge */}
            <div className="bg-[#FAF8F5] rounded-xl py-3.5 px-4 border border-stone-200/60">
              <p className="text-xs text-stone-500">{t.personalInviteFor}</p>
              <p className="text-lg font-semibold mt-0.5">{initialGuest.full_name}</p>
              {initialGuest.extra_guests > 0 && (
                <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold bg-[#2E5A44]/10 text-[#2E5A44] px-2.5 py-0.5 rounded-full">
                  <Users className="w-3 h-3" /> {t.plusGuests(initialGuest.extra_guests)}
                </span>
              )}
            </div>

            {event.custom_message && (
              <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                {event.custom_message}
              </p>
            )}

            {/* Date & Location */}
            <div className="pt-2 space-y-2.5 text-sm text-stone-700 border-t border-stone-100">
              <div className="flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4 text-[#B48A5A] shrink-0" />
                <span>
                  {new Date(event.event_date).toLocaleDateString(isAr ? 'ar-KW' : 'en-KW', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2">
                <MapPin className="w-4 h-4 text-[#B48A5A] shrink-0" />
                <span>{event.location_name}</span>
              </div>

              {event.maps_url && (
                <a
                  href={event.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs font-semibold text-[#2E5A44] underline underline-offset-4 pt-1"
                >
                  {t.openMaps}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* RSVP Action Card */}
        {status === 'pending' || status === 'draft' ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200/80 space-y-4">
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.notePlaceholder}
              className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E5A44]/30"
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={loading}
                onClick={() => handleResponse('accepted')}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#2E5A44] text-white font-semibold py-3.5 text-sm shadow-sm active:scale-[0.99] transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {loading ? t.saving : t.acceptBtn}
              </button>

              <button
                disabled={loading}
                onClick={() => handleResponse('declined')}
                className="flex items-center justify-center gap-2 rounded-xl bg-stone-100 text-stone-700 font-semibold py-3.5 text-sm hover:bg-stone-200/70 active:scale-[0.99] transition disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                {t.declineBtn}
              </button>
            </div>
          </div>
        ) : status === 'accepted' ? (
          /* Personal QR Entry Pass */
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#2E5A44]/30 text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2E5A44] bg-[#2E5A44]/10 px-3 py-1 rounded-full">
              <Check className="w-3.5 h-3.5" /> {t.passTitle}
            </div>

            <div className="flex justify-center py-2">
              <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-xs">
                <QRCodeSVG
                  value={initialGuest.invite_token}
                  size={170}
                  fgColor="#1C1917"
                  bgColor="#FFFFFF"
                  level="M"
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-bold text-base">{initialGuest.full_name}</p>
              <p className="text-xs font-medium text-[#2E5A44]">
                {t.admits(totalHeadcount)}
              </p>
              <p className="text-[11px] text-stone-400 pt-1">
                {t.scanHint}
              </p>
            </div>

            <button
              onClick={() => setStatus('pending')}
              className="text-xs text-stone-400 underline pt-2"
            >
              {t.changeResponse}
            </button>
          </div>
        ) : (
          /* Declined State */
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200/80 text-center space-y-3">
            <p className="text-sm font-medium text-stone-700">
              {t.declinedMsg}
            </p>
            <button
              onClick={() => setStatus('pending')}
              className="text-xs font-semibold text-[#2E5A44] underline"
            >
              {t.changeResponse}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
