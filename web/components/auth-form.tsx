'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getClientApiBaseUrl } from '../lib/api';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    setSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
        name: String(formData.get('name') ?? ''),
        acceptedTosVersion: String(formData.get('acceptedTosVersion') ?? '')
      };
      const apiBaseUrl = getClientApiBaseUrl();

      const response = await fetch(`${apiBaseUrl}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as { user?: { email?: string; role?: string }; message?: string };
      if (!response.ok) {
        setMessage(data.message ?? 'Authentication failed.');
        return;
      }

      setMessage(response.ok ? `Signed in as ${data.user?.email ?? payload.email}` : 'Authentication failed.');
      router.push(data.user?.role === 'admin' || data.user?.role === 'moderator' ? '/admin' : '/account');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not reach the API. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={onSubmit} className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-8">
      {mode === 'register' ? <input name="name" placeholder="Name" className="w-full rounded-2xl bg-white/10 px-4 py-3" /> : null}
      <input name="email" type="email" placeholder="Email" className="w-full rounded-2xl bg-white/10 px-4 py-3" />
      <input name="password" type="password" placeholder="Password" className="w-full rounded-2xl bg-white/10 px-4 py-3" />
      {mode === 'register' ? (
        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist/85">
          <input type="checkbox" required className="mt-1" />
          <span>
            I accept the current Terms of Service.
            <input type="hidden" name="acceptedTosVersion" value="2026.03" />
          </span>
        </label>
      ) : null}
      <button disabled={submitting} className="rounded-full bg-accent px-5 py-3 font-medium text-ink disabled:opacity-60">
        {submitting ? 'Working...' : mode === 'login' ? 'Log In' : 'Create Account'}
      </button>
      {message ? <p className="text-sm text-gold">{message}</p> : null}
    </form>
  );
}
