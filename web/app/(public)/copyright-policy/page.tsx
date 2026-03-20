import { AppShell } from '../../../components/app-shell';
import { DmcaForm } from '../../../components/dmca-form';
import { fetchJson } from '../../../lib/api';

export default async function CopyrightPolicyPage() {
  const policy = await fetchJson<any>('/legal/copyright-policy');

  return (
    <AppShell>
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.25em] text-gold">DMCA / Takedown</p>
          <h1 className="mt-4 font-display text-5xl">{policy.title}</h1>
          <p className="mt-6 text-lg leading-8 text-mist/80">{policy.body}</p>
        </div>
        <DmcaForm />
      </div>
    </AppShell>
  );
}

