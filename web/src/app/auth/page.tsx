'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (res.ok) {
      router.push('/dashboard/connections');
    } else {
      const data = await res.json();
      setError(data.error ?? 'Что-то пошло не так');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-1 gradient-text inline-block">
          Второй мозг
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Персональный AI-ассистент по переписками Telegram
        </p>

        <div
          className="rounded-xl p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Табы */}
          <div className="flex mb-6 rounded-lg overflow-hidden" style={{ background: 'var(--surface-2)' }}>
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className="flex-1 py-2 text-sm font-medium transition-colors rounded-lg"
                style={{
                  background: tab === t ? 'var(--accent-soft)' : 'transparent',
                  color: tab === t ? '#0d0d0f' : 'var(--text-muted)',
                }}
              >
                {t === 'login' ? 'Войти' : 'Регистрация'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === 'register' ? 'Минимум 8 символов' : '••••••••'}
                required
                minLength={8}
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full mt-1" disabled={loading}>
              {loading ? 'Загрузка...' : tab === 'login' ? 'Войти' : 'Создать аккаунт'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
