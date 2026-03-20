import { AppShell } from '../../../components/app-shell';
import { fetchJson } from '../../../lib/api';

export default async function TermsPage() {
  const terms = await fetchJson<any>('/legal/terms');

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.25em] text-gold">Terms of Service</p>
        <h1 className="mt-4 font-display text-5xl">{terms.title}</h1>
        <p className="mt-3 text-sm text-mist/60">Version {terms.version} • Published {terms.publishedAt}</p>
        <div className="mt-8 text-base leading-8 text-mist/85">{terms.content}</div>
      </div>
    </AppShell>
  );
}

