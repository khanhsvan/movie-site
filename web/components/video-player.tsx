'use client';

import Hls from 'hls.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PlaybackAuthorizationResponse } from '@netflix-mini/types';

type Props = {
  playback: PlaybackAuthorizationResponse;
};

export function VideoPlayer({ playback }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [progress, setProgress] = useState(playback.resumeSeconds ?? 0);
  const [locked, setLocked] = useState(false);
  const isHls = playback.manifestUrl?.toLowerCase().includes('.m3u8') ?? false;

  const qualities = useMemo(
    () => [
      { label: 'Auto', value: -1 },
      { label: '360p', value: 0 },
      { label: '720p', value: 1 },
      { label: '1080p', value: 2 }
    ],
    []
  );

  useEffect(() => {
    if (!playback.manifestUrl || !videoRef.current) {
      return;
    }

    const video = videoRef.current;

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: (xhr) => {
          xhr.withCredentials = true;
        }
      });
      hls.loadSource(playback.manifestUrl);
      hls.attachMedia(video);

      return () => hls.destroy();
    }

    video.crossOrigin = 'use-credentials';
    video.src = playback.manifestUrl;
  }, [isHls, playback.manifestUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const onTimeUpdate = () => {
      setProgress(video.currentTime);
      if (playback.previewEndsAtSeconds && video.currentTime >= playback.previewEndsAtSeconds && playback.message) {
        video.pause();
        setLocked(true);
      }
    };

    video.currentTime = playback.resumeSeconds ?? 0;
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, [playback.message, playback.previewEndsAtSeconds, playback.resumeSeconds]);

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-black" onContextMenu={(event) => event.preventDefault()}>
      <video ref={videoRef} controls controlsList="nodownload noplaybackrate" className="aspect-video w-full" />
      <div className="pointer-events-none absolute right-6 top-6 rounded-full bg-black/45 px-3 py-2 text-xs text-white/80">
        {playback.watermarkText ?? 'Protected stream'}
      </div>
      <div className="flex items-center justify-between border-t border-white/10 bg-ink/80 px-4 py-3 text-sm">
        <span>Resume at {Math.floor(progress)}s</span>
        <div className="flex items-center gap-2">
          {qualities.map((quality) => (
            <button key={quality.label} className="rounded-full border border-white/10 px-3 py-1 text-xs text-mist">
              {quality.label}
            </button>
          ))}
        </div>
      </div>
      {locked ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink/90 text-center">
          <p className="font-display text-3xl">Preview complete</p>
          <p className="max-w-md text-mist/80">{playback.message}</p>
          <a href="/pricing" className="rounded-full bg-accent px-5 py-3 font-medium text-ink">
            Unlock full access
          </a>
        </div>
      ) : null}
    </div>
  );
}
