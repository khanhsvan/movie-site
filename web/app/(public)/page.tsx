import { CatalogVideo } from '@netflix-mini/types';
import { AppShell } from '../../components/app-shell';
import { VideoCard } from '../../components/video-card';
import { getApiBaseUrl } from '../../lib/api';
import { demoCatalogVideos } from '../../lib/demo-catalog';

type CatalogLoadResult = {
  videos: CatalogVideo[];
  warning: string | null;
};

async function loadCatalog(): Promise<CatalogLoadResult> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/videos`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const videos = (await response.json()) as CatalogVideo[];
    const warningHeader = response.headers.get('x-catalog-warning');
    const warning = warningHeader ? decodeURIComponent(warningHeader) : null;

    if (!videos.length) {
      return {
        videos: demoCatalogVideos,
        warning: warning ?? 'PostgreSQL catalog is empty. Showing demo videos instead.'
      };
    }

    return {
      videos,
      warning
    };
  } catch (error) {
    return {
      videos: demoCatalogVideos,
      warning: `Catalog fallback active: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export default async function HomePage() {
  const { videos, warning } = await loadCatalog();

  return (
    <AppShell>
      <section className="mb-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <p className="text-sm uppercase tracking-[0.35em] text-gold">Cinema at home</p>
          <h1 className="font-display text-6xl leading-none">Premium streaming with guest previews and full subscription control.</h1>
          <p className="max-w-2xl text-lg text-mist/80">
            Browse films and episodic series, preview locked premium titles, and continue watching from any device.
          </p>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.25em] text-mist/60">Included</p>
          <ul className="mt-4 space-y-3 text-mist/85">
            <li>JWT auth with refresh rotation</li>
            <li>HLS playback authorization</li>
            <li>Admin uploads and FFmpeg worker queue</li>
            <li>Stripe subscriptions and analytics</li>
          </ul>
        </div>
      </section>
      {warning ? (
        <div className="mb-8 rounded-[28px] border border-amber-400/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          {warning}
        </div>
      ) : null}
      <section className="grid gap-6 md:grid-cols-2">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </section>
    </AppShell>
  );
}
