'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { KeyRound, Loader2, Globe } from 'lucide-react';

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isAr = lang === 'ar';

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      alert(isAr ? 'يجب أن تكون كلمة المرور ٦ أحرف على الأقل.' : 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      alert(isAr ? 'تم تحديث كلمة المرور بنجاح!' : 'Password updated successfully!');
      router.push('/');
    }
  }

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#2E5A44]/10 text-[#2E5A44] flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={() => setLang(isAr ? 'en' : 'ar')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200/70 px-3 py-1.5 rounded-full"
          >
            <Globe className="w-3.5 h-3.5 text-[#2E5A44]" />
            {isAr ? 'English' : 'عربي'}
          </button>
        </div>

        <h1 className="text-2xl font-bold text-stone-900 mb-1">
          {isAr ? 'تعيين كلمة مرور جديدة' : 'Set New Password'}
        </h1>
        <p className="text-sm text-stone-500 mb-6">
          {isAr
            ? 'أدخل كلمة المرور الجديدة أدناه للوصول إلى حسابك.'
            : 'Enter your new password below to access your account.'}
        </p>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <input
            type="password"
            required
            minLength={6}
            placeholder={isAr ? 'كلمة المرور الجديدة (٦ أحرف على الأقل)' : 'New password (min 6 characters)'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#2E5A44]"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2E5A44] text-white font-semibold py-3 rounded-xl hover:bg-[#244736] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isAr ? 'تحديث كلمة المرور' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
