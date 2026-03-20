import { UserRole } from '@netflix-mini/types';
import { AppShell } from '../../../components/app-shell';
import { fetchJson } from '../../../lib/api';
import { requireRole } from '../../../lib/session';

export default async function AdminUsersPage() {
  await requireRole([UserRole.ADMIN]);
  const users = await fetchJson<any[]>('/admin/users');

  return (
    <AppShell>
      <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
        <h1 className="font-display text-5xl">Users</h1>
        <div className="mt-8 space-y-4">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-4">
              <div>
                <p className="font-medium">{user.email}</p>
                <p className="text-sm text-mist/70">{user.role}</p>
                <p className="text-xs text-mist/50">{(user.permissions ?? []).join(', ') || 'No permissions listed'}</p>
              </div>
              <div className="text-right">
                <p className="rounded-full border border-gold/30 px-3 py-1 text-xs text-gold">{user.subscriptionStatus ?? 'N/A'}</p>
                <p className="mt-2 text-xs text-mist/60">{user.isBanned ? 'Banned' : 'Active'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
