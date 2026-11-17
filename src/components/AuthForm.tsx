'use client';

import { useState } from 'react';
import { Sparkles, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function AuthForm({ onAuthenticated }: { onAuthenticated: (user: any) => void }) {
  const supabase = createClient();
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  const isAr = lang === 'ar';

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    const fn =
      authMode === 'login'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });

    const { data, error } = await fn;
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

  return (
    <main
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6 text-[#1C1917]"
    >
      <form
        onSubmit={handleAuth}
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
          {/* <Sparkles className="w-6 h-6 mx-auto text-[#B48A5A]" /> */}
          <h1 className="text-2xl font-bold">
            {isAr ? 'بوابة مضيفي حيّاك' : '7yak Host Portal'}
          </h1>
          <p className="text-xs text-stone-500">
            {isAr
              ? 'إدارة الدعوات وقوائم الضيوف وتسجيل الدخول عند الباب'
              : 'Manage invitations, family groups & live check-ins'}
          </p>
        </div>

        {authError && (
          <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg">{authError}</p>
        )}
        {authSuccess && (
          <p className="text-xs text-[#2E5A44] bg-[#2E5A44]/10 p-2.5 rounded-lg">{authSuccess}</p>
        )}

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
            placeholder={isAr ? 'كلمة المرور (٦ أحرف على الأقل)' : 'Password (min 6 chars)'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] px-3.5 py-2.5 text-sm"
          />
          {authMode === 'login' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-semibold text-[#2E5A44] hover:underline"
              >
                {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-[#2E5A44] text-white font-semibold py-3 rounded-xl text-sm hover:bg-[#244736]"
        >
          {authMode === 'login'
            ? isAr
              ? 'تسجيل الدخول'
              : 'Sign In'
            : isAr
            ? 'إنشاء حساب مضيف'
            : 'Create Host Account'}
        </button>

        <button
          type="button"
          onClick={() => {
            setAuthMode(authMode === 'login' ? 'signup' : 'login');
            setAuthError('');
            setAuthSuccess('');
          }}
          className="w-full text-xs text-stone-500 underline"
        >
          {authMode === 'login'
            ? isAr
              ? 'ليس لديك حساب؟ أنشئ حساباً جديداً'
              : 'Need an account? Sign up'
            : isAr
            ? 'لديك حساب بالفعل؟ سجّل الدخول'
            : 'Already have an account? Sign in'}
        </button>
      </form>
    </main>
  );
}
