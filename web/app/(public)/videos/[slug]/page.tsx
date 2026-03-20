import { EpisodeSummary, VideoType } from '@netflix-mini/types';
import Link from 'next/link';
import { AppShell } from '../../../../components/app-shell';
import { fetchJson } from '../../../../lib/api';

type VideoDetail = {
  id: string;
  type: VideoType;
  title: string;
  description: string;
  accessTier: string;
  previewDurationSeconds: number;
  tags: string[];
  episodes?: EpisodeSummary[];
};

export default async function VideoDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const video = await fetchJson<VideoDetail>(`/videos/${slug}`);
  const firstEpisode = video.episodes?.[0];
  const playHref =
    video.type === VideoType.SERIES && firstEpisode
      ? `/watch/${video.id}?episodeId=${firstEpisode.id}`
      : `/watch/${video.id}`;

  return (
    <AppShell>
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <p className="text-sm uppercase tracking-[0.25em] text-gold">{video.type}</p>
          <h1 className="font-display text-6xl">{video.title}</h1>
          <p className="text-lg text-mist/80">{video.description}</p>
          <div className="flex gap-3">
            <Link href={playHref} className="rounded-full bg-accent px-5 py-3 font-semibold text-ink">
              {video.type === VideoType.SERIES ? 'Start series' : 'Play now'}
            </Link>
            <Link href="/pricing" className="rounded-full border border-white/15 px-5 py-3 text-mist">
              Upgrade
            </Link>
          </div>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.25em] text-mist/60">Metadata</p>
          <dl className="mt-6 space-y-4 text-sm text-mist/85">
            <div className="flex justify-between gap-6"><dt>Access</dt><dd>{video.accessTier}</dd></div>
            <div className="flex justify-between gap-6"><dt>Preview</dt><dd>{video.previewDurationSeconds}s</dd></div>
            <div className="flex justify-between gap-6"><dt>Tags</dt><dd>{video.tags.join(', ')}</dd></div>
          </dl>
          {video.episodes?.length ? (
            <div className="mt-8 space-y-3">
              <p className="text-sm uppercase tracking-[0.25em] text-mist/60">Episodes</p>
              {video.episodes.map((episode) => (
                <Link
                  key={episode.id}
                  href={`/watch/${video.id}?episodeId=${episode.id}`}
                  className="block rounded-2xl border border-white/10 px-4 py-3 transition hover:border-accent/50 hover:bg-white/5"
                >
                  <p className="font-medium text-white">
                    S{episode.seasonNumber}E{episode.episodeNumber} - {episode.title}
                  </p>
                  <p className="mt-1 text-sm text-mist/70">{episode.description}</p>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
