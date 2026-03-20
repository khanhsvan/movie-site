import { Injectable } from '@nestjs/common';

type WatchHistoryRecord = {
  videoId: string;
  episodeId?: string;
  title: string;
  progressSeconds: number;
  durationSeconds: number;
  updatedAt: string;
};

const watchHistory = new Map<string, WatchHistoryRecord[]>([
  [
    'user_demo_1',
    [
      {
        videoId: 'vid_movie_1',
        title: 'Galaxy Heist',
        progressSeconds: 642,
        durationSeconds: 6120,
        updatedAt: new Date().toISOString()
      }
    ]
  ]
]);

@Injectable()
export class WatchHistoryService {
  saveProgress(userId: string, payload: { videoId: string; episodeId?: string; progressSeconds: number }) {
    const userHistory = watchHistory.get(userId) ?? [];
    const existing = userHistory.find(
      (entry) => entry.videoId === payload.videoId && entry.episodeId === payload.episodeId
    );

    if (existing) {
      existing.progressSeconds = payload.progressSeconds;
      existing.updatedAt = new Date().toISOString();
    } else {
      userHistory.unshift({
        videoId: payload.videoId,
        episodeId: payload.episodeId,
        progressSeconds: payload.progressSeconds,
        durationSeconds: 0,
        title: payload.videoId,
        updatedAt: new Date().toISOString()
      });
    }

    watchHistory.set(userId, userHistory);

    return {
      success: true,
      ...payload,
      updatedAt: new Date().toISOString()
    };
  }

  continueWatching(userId: string) {
    return watchHistory.get(userId) ?? [];
  }
}
