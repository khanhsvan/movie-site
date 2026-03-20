import { AppShell } from '../../../components/app-shell';
import { LicenseAdminForm } from '../../../components/license-admin-form';
import { fetchJson } from '../../../lib/api';

export default async function AdminCompliancePage() {
  const [overview, licenses, accessLogs] = await Promise.all([
    fetchJson<any>('/admin/compliance/overview'),
    fetchJson<any[]>('/admin/licenses'),
    fetchJson<any[]>('/admin/access-logs')
  ]);

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6"><p className="text-sm text-mist/70">Valid licenses</p><p className="mt-2 font-display text-4xl">{overview.validLicenses}</p></div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6"><p className="text-sm text-mist/70">Expired</p><p className="mt-2 font-display text-4xl">{overview.expiredLicenses}</p></div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6"><p className="text-sm text-mist/70">Pending DMCA</p><p className="mt-2 font-display text-4xl">{overview.pendingDmcaRequests}</p></div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6"><p className="text-sm text-mist/70">Under review</p><p className="mt-2 font-display text-4xl">{overview.underReviewContent}</p></div>
        </div>
        <LicenseAdminForm />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
            <h2 className="font-display text-4xl">Licenses</h2>
            <div className="mt-6 space-y-4">
              {licenses.map((license) => (
                <div key={license.id} className="rounded-2xl border border-white/10 px-4 py-4 text-sm text-mist/85">
                  <p className="font-medium text-white">{license.id}</p>
                  <p>{license.contentTitle}</p>
                  <p>{license.ownerName}</p>
                  <p>Status: {license.status}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
            <h2 className="font-display text-4xl">Access logs</h2>
            <div className="mt-6 space-y-4">
              {accessLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-white/10 px-4 py-4 text-sm text-mist/85">
                  <p className="font-medium text-white">{log.videoId}</p>
                  <p>User: {log.userId ?? 'guest'}</p>
                  <p>IP: {log.ipAddress}</p>
                  <p>{log.timestamp}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
