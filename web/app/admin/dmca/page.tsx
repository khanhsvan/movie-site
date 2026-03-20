import { AppShell } from '../../../components/app-shell';
import { fetchJson } from '../../../lib/api';

export default async function AdminDmcaPage() {
  const requests = await fetchJson<any[]>('/admin/dmca-requests');

  return (
    <AppShell>
      <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
        <h1 className="font-display text-5xl">DMCA requests</h1>
        <div className="mt-6 space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="rounded-2xl border border-white/10 px-4 py-4 text-sm text-mist/85">
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium text-white">{request.reporterName}</p>
                <p className="rounded-full border border-gold/20 px-3 py-1 text-xs text-gold">{request.status}</p>
              </div>
              <p className="mt-2">{request.contentUrl}</p>
              <p className="mt-1">{request.reason}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
