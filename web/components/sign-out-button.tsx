'use client';

import { useRouter } from 'next/navigation';
import { getClientApiBaseUrl } from '../lib/api';

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch(`${getClientApiBaseUrl()}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });

    router.push('/login');
    router.refresh();
  }

  return (
    <button type="button" onClick={signOut} className="rounded-full border border-white/15 px-4 py-2 text-sm text-mist">
      Sign out
    </button>
  );
}
