import { UserRole } from '@netflix-mini/types';
import Link from 'next/link';
import { AdminControlCenter } from '../../components/admin-control-center';
import { AppShell } from '../../components/app-shell';
import { requireRole } from '../../lib/session';

export default async function AdminPage() {
  const user = await requireRole([UserRole.ADMIN, UserRole.MODERATOR]);
  const canManageUsers = user.role === UserRole.ADMIN;

  return (
    <AppShell>
      <div className="space-y-8">
        <AdminControlCenter canManageUsers={canManageUsers} />
        <section className="grid gap-6 md:grid-cols-3">
          <Link href="/admin/upload" className="rounded-[28px] border border-white/10 bg-white/5 p-8">
            <h2 className="font-display text-3xl">Upload wizard</h2>
            <p className="mt-4 text-mist/75">Guided upload with progress tracking and direct storage transfer.</p>
          </Link>
          <Link href="/admin/analytics" className="rounded-[28px] border border-white/10 bg-white/5 p-8">
            <h2 className="font-display text-3xl">Analytics</h2>
            <p className="mt-4 text-mist/75">See watch numbers and platform activity.</p>
          </Link>
          <Link href="/admin/compliance" className="rounded-[28px] border border-white/10 bg-white/5 p-8">
            <h2 className="font-display text-3xl">Compliance</h2>
            <p className="mt-4 text-mist/75">Open legal, license, and DMCA tools when needed.</p>
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
