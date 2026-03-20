import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticsService {
  overview() {
    return {
      totalViews: 18420,
      uniqueViewers: 4120,
      totalWatchSeconds: 982340,
      activeSubscribers: 1180,
      recentActivity: [
        { label: 'New playback sessions today', value: 238 },
        { label: 'Transcode failures', value: 1 }
      ]
    };
  }
}

