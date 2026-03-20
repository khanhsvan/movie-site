import { AppShell } from '../../components/app-shell';
import { AccountDashboard } from '../../components/account-dashboard';
import { fetchJson } from '../../lib/api';

export default async function AccountPage() {
  const [profile, subscription, continueWatching] = await Promise.all([
    fetchJson<any>('/users/me'),
    fetchJson<any>('/subscriptions/me'),
    fetchJson<any[]>('/watch-history/continue')
  ]);

  return (
    <AppShell>
      <AccountDashboard
        profile={profile}
        subscription={subscription}
        continueWatching={continueWatching}
      />
    </AppShell>
  );
}
