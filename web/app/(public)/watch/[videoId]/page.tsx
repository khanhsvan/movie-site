import { CatalogVideo, EpisodeSummary } from '@netflix-mini/types';
import Link from 'next/link';
import { AppShell } from '../../../../components/app-shell';
import { VideoPlayer } from '../../../../components/video-player';
import { fetchJson } from '../../../../lib/api';

type WatchPageProps = {
  params: Promise<{ videoId: string }>;
  searchParams: Promise<{ episodeId?: string }>;
};

type PlaybackResponse = {
  allowed: boolean;
  message?: string;
  manifestUrl?: string;
  previewEndsAtSeconds?: number;
  resumeSeconds?: number;
  watermarkText?: string;
};

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { videoId } = await params;
  const { episodeId } = await searchParams;

  const [playback, episodes, catalog] = await Promise.all([
    fetchJson<PlaybackResponse>(`/videos/${videoId}/playback`),
    fetchJson<EpisodeSummary[]>(`/series/${videoId}/episodes`).catch(() => []),
    fetchJson<CatalogVideo[]>('/videos').catch(() => [])
  ]);

  const video = catalog.find((entry) => entry.id === videoId);
  const activeEpisode = episodeId ? episodes.find((episode) => episode.id === episodeId) ?? episodes[0] : episodes[0];
  const activeEpisodeIndex = activeEpisode ? episodes.findIndex((episode) => episode.id === activeEpisode.id) : -1;
  const previousEpisode = activeEpisodeIndex > 0 ? episodes[activeEpisodeIndex - 1] : null;
  const nextEpisode =
    activeEpisodeIndex >= 0 && activeEpisodeIndex < episodes.length - 1 ? episodes[activeEpisodeIndex + 1] : null;
  const currentTitle = activeEpisode?.title ?? video?.title ?? 'Now playing';
  const currentDescription =
    activeEpisode?.description ?? video?.description ?? 'Start playback and continue your session from here.';
  const currentBadge = activeEpisode
    ? `Season ${activeEpisode.seasonNumber} | Episode ${activeEpisode.episodeNumber}`
    : video?.type ?? 'Now playing';

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
            <p className="text-sm uppercase tracking-[0.25em] text-gold">{currentBadge}</p>
            <h1 className="mt-3 font-display text-5xl">{currentTitle}</h1>
            <p className="mt-4 max-w-3xl text-lg text-mist/75">{currentDescription}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              {previousEpisode ? (
                <Link
                  href={`/watch/${videoId}?episodeId=${previousEpisode.id}`}
                  className="rounded-full border border-white/15 px-5 py-3 text-mist"
                >
                  Previous episode
                </Link>
              ) : null}
              {nextEpisode ? (
                <Link
                  href={`/watch/${videoId}?episodeId=${nextEpisode.id}`}
                  className="rounded-full bg-accent px-5 py-3 font-semibold text-ink"
                >
                  Next episode
                </Link>
              ) : null}
              <Link href="/videos" className="rounded-full border border-white/15 px-5 py-3 text-mist">
                Back to library
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
            <p className="text-sm uppercase tracking-[0.25em] text-mist/60">Playback details</p>
            <div className="mt-6 space-y-4 text-sm text-mist/75">
              <div className="flex items-center justify-between gap-6">
                <span>Preview limit</span>
                <span>{playback.previewEndsAtSeconds ? `${playback.previewEndsAtSeconds}s` : 'Unlimited'}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span>Resume position</span>
                <span>{playback.resumeSeconds ?? 0}s</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span>Series episodes</span>
                <span>{episodes.length || 1}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            {playback.allowed ? (
              <VideoPlayer playback={playback} />
            ) : (
              <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 text-mist/85">
                <p className="font-display text-3xl text-white">Playback unavailable</p>
                <p className="mt-4">{playback.message}</p>
              </div>
            )}
          </div>

          {episodes.length ? (
            <aside className="rounded-[32px] border border-white/10 bg-white/5 p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-mist/60">Episode list</p>
                  <h2 className="mt-3 font-display text-3xl">Choose where to continue</h2>
                </div>
                <span className="rounded-full border border-white/15 px-4 py-2 text-xs text-mist">
                  {episodes.length} episodes
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {episodes.map((episode) => {
                  const selected = activeEpisode?.id === episode.id;
                  return (
                    <Link
                      key={episode.id}
                      href={`/watch/${videoId}?episodeId=${episode.id}`}
                      className={`block rounded-2xl border px-4 py-4 transition ${
                        selected
                          ? 'border-accent/60 bg-accent/10'
                          : 'border-white/10 hover:border-accent/40 hover:bg-white/5'
                      }`}
                    >
                      <p className="font-medium text-white">
                        S{episode.seasonNumber}E{episode.episodeNumber} - {episode.title}
                      </p>
                      <p className="mt-2 text-sm text-mist/70">{episode.description}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-mist/45">
                        {Math.max(1, Math.round(episode.durationSeconds / 60))} min runtime
                      </p>
                    </Link>
                  );
                })}
              </div>
            </aside>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
