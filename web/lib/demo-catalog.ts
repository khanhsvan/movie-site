import { CatalogVideo, EpisodeSummary, RestrictionReason, VideoAccessTier, VideoType, VideoVisibility } from '@netflix-mini/types';

export const demoCatalogVideos: CatalogVideo[] = [
  {
    id: 'vid_movie_1',
    slug: 'galaxy-heist',
    title: 'Galaxy Heist',
    description: 'A premium sci-fi caper with a crew of impossible specialists.',
    type: VideoType.MOVIE,
    accessTier: VideoAccessTier.PREMIUM,
    durationSeconds: 6120,
    thumbnailUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=80',
    tags: ['Sci-Fi', 'Action'],
    previewDurationSeconds: 180,
    visibility: VideoVisibility.RESTRICTED,
    restrictionReason: RestrictionReason.DMCA
  },
  {
    id: 'vid_series_1',
    slug: 'midnight-files',
    title: 'Midnight Files',
    description: 'A serialized mystery about a newsroom tracking urban legends.',
    type: VideoType.SERIES,
    accessTier: VideoAccessTier.FREE,
    durationSeconds: 0,
    thumbnailUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80',
    tags: ['Mystery', 'Drama'],
    previewDurationSeconds: 180,
    visibility: VideoVisibility.PUBLIC,
    restrictionReason: RestrictionReason.NONE
  }
];

export const demoEpisodesBySeriesId: Record<string, EpisodeSummary[]> = {
  vid_series_1: [
    {
      id: 'ep_1',
      seriesId: 'vid_series_1',
      title: 'Pilot',
      description: 'The newsroom receives a tape that should not exist.',
      durationSeconds: 1620,
      seasonNumber: 1,
      episodeNumber: 1,
      thumbnailUrl: 'https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=900&q=80'
    },
    {
      id: 'ep_2',
      seriesId: 'vid_series_1',
      title: 'Static Line',
      description: 'A second lead reveals the cost of staying curious.',
      durationSeconds: 1580,
      seasonNumber: 1,
      episodeNumber: 2,
      thumbnailUrl: 'https://images.unsplash.com/photo-1505685296765-3a2736de412f?auto=format&fit=crop&w=900&q=80'
    }
  ]
};
