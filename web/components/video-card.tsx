import Link from 'next/link';
import { CatalogVideo } from '@netflix-mini/types';

export function VideoCard({ video }: { video: CatalogVideo }) {
  const thumbnailUrl = video.thumbnailUrl?.trim() || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=80';
  const safeSlug = video.slug?.trim();
  const href = safeSlug ? `/videos/${safeSlug}` : `/watch/${video.id}`;
  const displayTitle =
    video.title?.trim() ||
    safeSlug
      ?.split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') ||
    'Untitled video';

  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/5 transition hover:-translate-y-1 hover:border-accent/60"
    >
      <div className="relative h-56">
        <img
          src={thumbnailUrl}
          alt={video.title}
          className="h-full w-full object-cover transition group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-mist/70">
          <span>{video.type}</span>
          <span>{video.accessTier}</span>
        </div>
        <h3 className="font-display text-2xl">{displayTitle}</h3>
        <p className="line-clamp-3 text-sm text-mist/80">{video.description}</p>
      </div>
    </Link>
  );
}
