import { AppShell } from '../../../components/app-shell';
import { fetchJson } from '../../../lib/api';

export default async function AdminAnalyticsPage() {
  const analytics = await fetchJson<any>('/admin/analytics/overview');

  return (
    <AppShell>
      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6"><p className="text-sm text-mist/70">Views</p><p className="mt-3 font-display text-4xl">{analytics.totalViews}</p></div>
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6"><p className="text-sm text-mist/70">Viewers</p><p className="mt-3 font-display text-4xl">{analytics.uniqueViewers}</p></div>
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6"><p className="text-sm text-mist/70">Watch Sec</p><p className="mt-3 font-display text-4xl">{analytics.totalWatchSeconds}</p></div>
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6"><p className="text-sm text-mist/70">Subscribers</p><p className="mt-3 font-display text-4xl">{analytics.activeSubscribers}</p></div>
      </div>
    </AppShell>
  );
}
