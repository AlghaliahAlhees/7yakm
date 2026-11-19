'use client';

import { useState } from 'react';
import { Sparkles, Globe, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function AuthForm({ onAuthenticated }: { onAuthenticated: (user: any) => void }) {
  const supabase = createClient();
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  const isAr = lang === 'ar';

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setAuthError(error.message);
    if (data.user) onAuthenticated(data.user);
  }

  async function handleForgotPassword() {
    setAuthError('');
    setAuthSuccess('');
    if (!email.trim()) {
      return setAuthError(
        isAr ? 'يرجى إدخال البريد الإلكتروني أولاً.' : 'Please enter your email address first.'
      );
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return setAuthError(error.message);
    setAuthSuccess(
      isAr
        ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.'
        : 'Password reset link sent! Check your email inbox.'
    );
  }
  const whatsappOrderUrl = `https://wa.me/96599535772?text=${encodeURIComponent(
    isAr
      ? 'السلام عليكم، أرغب بالاشتراك في باقة دعوات حيّاك'
      : 'Hello, I would like to purchase a 7yak invitation package.'
  )}`;

  return (
    <main
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6 text-[#1C1917]"
    >
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-white p-7 rounded-2xl shadow-sm border border-stone-200 space-y-4"
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setLang(isAr ? 'en' : 'ar')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200/70 px-3 py-1.5 rounded-full"
          >
            <Globe className="w-3.5 h-3.5 text-[#2E5A44]" />
            {isAr ? 'English' : 'عربي'}
          </button>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">
            {isAr ? 'بوابة مضيفي حيّاك' : '7yak Host Portal'}
          </h1>
          <p className="text-xs text-stone-500">
            {isAr
              ? 'سجّل الدخول لإدارة مناسبتك وقائمة المدعوين'
              : 'Sign in to manage your event & guest invitations'}
          </p>
        </div>

        {authError && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg">{authError}</p>}
        {authSuccess && <p className="text-xs text-[#2E5A44] bg-[#2E5A44]/10 p-2.5 rounded-lg">{authSuccess}</p>}

        <input
          type="email"
          required
          placeholder={isAr ? 'البريد الإلكتروني' : 'Email address'}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] px-3.5 py-2.5 text-sm"
        />

        <div className="space-y-1.5">
          <input
            type="password"
            required
            placeholder={isAr ? 'كلمة المرور' : 'Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] px-3.5 py-2.5 text-sm"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs font-semibold text-[#2E5A44] hover:underline"
            >
              {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-[#2E5A44] text-white font-semibold py-3 rounded-xl text-sm hover:bg-[#244736]"
        >
          {isAr ? 'تسجيل الدخول' : 'Sign In'}
        </button>

        <div className="pt-2 border-t border-stone-100 text-center space-y-2">
          <p className="text-xs text-stone-500">
            {isAr ? 'ليس لديك باقة مفعّلة بعد؟' : "Don't have an active package yet?"}
          </p>
          <a
            href={whatsappOrderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-[#FAF8F5] border border-stone-200 text-[#1C1917] font-semibold py-2.5 rounded-xl text-xs hover:border-[#2E5A44]"
          >
            <MessageCircle className="w-4 h-4 text-[#2E5A44]" />
            {isAr ? 'اطلب باقة دعوات عبر واتساب' : 'Request a Package via WhatsApp'}
          </a>
        </div>
      </form>
    </main>
  );
}
