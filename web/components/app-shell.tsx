import { UserRole } from '@netflix-mini/types';
import Link from 'next/link';
import { ReactNode } from 'react';
import { getCurrentUser } from '../lib/session';
import { SignOutButton } from './sign-out-button';

export async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const canAccessAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.MODERATOR;

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
        <Link href="/" className="font-display text-xl tracking-wide text-gold">
          StreamVault
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-mist">
          <Link href="/terms">Terms</Link>
          <Link href="/copyright-policy">Copyright</Link>
          <Link href="/verify-license">Verify License</Link>
          <Link href="/pricing">Pricing</Link>
          {user ? <Link href="/account">Account</Link> : <Link href="/login">Login</Link>}
          {!user ? <Link href="/register">Register</Link> : null}
          {canAccessAdmin ? <Link href="/admin">Admin</Link> : null}
          {user ? <SignOutButton /> : null}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
