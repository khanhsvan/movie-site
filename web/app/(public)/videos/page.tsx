import { CatalogVideo } from '@netflix-mini/types';
import { AppShell } from '../../../components/app-shell';
import { VideoCard } from '../../../components/video-card';
import { getApiBaseUrl } from '../../../lib/api';
import { demoCatalogVideos } from '../../../lib/demo-catalog';

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

export default async function VideosPage() {
  const { videos, warning } = await loadCatalog();

  return (
    <AppShell>
      <section className="mb-8 space-y-4">
        <p className="text-sm uppercase tracking-[0.25em] text-gold">Library</p>
        <h1 className="font-display text-5xl">Browse all available titles</h1>
        <p className="max-w-2xl text-mist/80">
          Explore movies and series from your current catalog. Titles shown here come from PostgreSQL first, then runtime/demo fallback if the database is empty.
        </p>
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
