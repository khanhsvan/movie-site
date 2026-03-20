import { Injectable } from '@nestjs/common';

type AccessLogEntry = {
  id: string;
  videoId: string;
  userId: string | null;
  ipAddress: string | null;
  timestamp: string;
  path: string;
};

@Injectable()
export class AccessAuditService {
  private readonly entries: AccessLogEntry[] = [
    {
      id: 'log_1',
      videoId: 'vid_movie_1',
      userId: 'user_demo_1',
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      path: '/videos/vid_movie_1/playback'
    }
  ];

  log(entry: Omit<AccessLogEntry, 'id' | 'timestamp'>) {
    const record = {
      id: `log_${this.entries.length + 1}`,
      timestamp: new Date().toISOString(),
      ...entry
    };

    this.entries.unshift(record);
    return record;
  }

  list(videoId?: string) {
    return videoId ? this.entries.filter((entry) => entry.videoId === videoId) : this.entries;
  }
}

