import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import {
  CatalogVideo,
  EpisodeSummary,
  RestrictionReason,
  VideoAccessTier,
  VideoType,
  VideoVisibility
} from '@netflix-mini/types';
import { PREVIEW_DURATION_SECONDS } from '@netflix-mini/config';

type VideoRecord = CatalogVideo & {
  storage: { masterPath: string; previewPath: string };
  visibility: VideoVisibility;
  restrictionReason: RestrictionReason;
  allowedRegions?: string[];
  requiresVerification?: boolean;
};

type VideoDetail = VideoRecord & {
  episodes: EpisodeSummary[];
};

type CatalogSource = 'database' | 'runtime' | 'demo';

type CatalogResponse<T> = {
  data: T;
  source: CatalogSource;
  warning?: string;
};

type VideoListRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: VideoType;
  access_tier: VideoAccessTier;
  duration_seconds: number;
  thumbnail_url: string;
  preview_duration_seconds: number | null;
  visible_bool: boolean;
  is_under_review: boolean;
};

type VideoAssetRow = VideoListRow & {
  master_playlist_path: string | null;
  preview_playlist_path: string | null;
};

type EpisodeRow = {
  id: string;
  video_id: string;
  title: string;
  description: string;
  duration_seconds: number;
  season_number: number;
  episode_number: number;
  thumbnail_url: string;
};

const fallbackDemoVideos: VideoRecord[] = [
  {
    id: 'vid_movie_1',
    slug: 'galaxy-heist',
    title: 'Galaxy Heist',
    description: 'A ready-to-play demo movie for checking the streaming flow before real content is added.',
    type: VideoType.MOVIE,
    accessTier: VideoAccessTier.FREE,
    durationSeconds: 6120,
    thumbnailUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=80',
    tags: ['Demo', 'Movie'],
    previewDurationSeconds: PREVIEW_DURATION_SECONDS,
    visibility: VideoVisibility.PUBLIC,
    restrictionReason: RestrictionReason.NONE,
    requiresVerification: false,
    allowedRegions: [],
    storage: {
      masterPath: '__demo__/movie/master.m3u8',
      previewPath: '__demo__/movie/preview.m3u8'
    }
  },
  {
    id: 'vid_series_1',
    slug: 'midnight-files',
    title: 'Midnight Files',
    description: 'A ready-to-play demo series so you can verify episode selection and playlist behavior.',
    type: VideoType.SERIES,
    accessTier: VideoAccessTier.FREE,
    durationSeconds: 0,
    thumbnailUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80',
    tags: ['Demo', 'Series'],
    previewDurationSeconds: PREVIEW_DURATION_SECONDS,
    visibility: VideoVisibility.PUBLIC,
    restrictionReason: RestrictionReason.NONE,
    storage: {
      masterPath: '__demo__/series/master.m3u8',
      previewPath: '__demo__/series/preview.m3u8'
    }
  }
];

const fallbackEpisodes: EpisodeSummary[] = [
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
];

@Injectable()
export class VideosService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VideosService.name);
  private readonly runtimeVideos: VideoRecord[] = [];
  private readonly runtimeEpisodes: EpisodeSummary[] = [];
  private readonly pool?: Pool;

  constructor() {
    if (process.env.DATABASE_URL) {
      this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
      this.pool.on('error', (error) => {
        this.logger.error(`PostgreSQL video pool error: ${error.message}`);
      });
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.pool) {
      this.logger.warn('DATABASE_URL is not configured. Catalog will use runtime/demo fallback.');
      return;
    }

    try {
      await this.pool.query('SELECT 1');
      this.logger.log('PostgreSQL connection established for video catalog.');
    } catch (error) {
      this.logger.error(`PostgreSQL connection test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }

  async list(type?: VideoType): Promise<CatalogVideo[]> {
    return (await this.listWithSource(type)).data;
  }

  async listWithSource(type?: VideoType): Promise<CatalogResponse<CatalogVideo[]>> {
    const database = await this.tryLoadCatalogFromDatabase(type);
    if (database) {
      return database;
    }

    if (this.runtimeVideos.length > 0) {
      const runtime = type ? this.runtimeVideos.filter((video) => video.type === type) : this.runtimeVideos;
      return {
        data: runtime.map((video) => this.toCatalogVideo(video)),
        source: 'runtime',
        warning: 'PostgreSQL catalog is empty or unavailable. Showing runtime-created videos.'
      };
    }

    const demo = type ? fallbackDemoVideos.filter((video) => video.type === type) : fallbackDemoVideos;
    return {
      data: demo.map((video) => this.toCatalogVideo(video)),
      source: 'demo',
      warning: 'PostgreSQL catalog is empty or unavailable. Showing demo videos instead.'
    };
  }

  async getBySlug(slug: string): Promise<VideoDetail> {
    return (await this.getBySlugWithSource(slug)).data;
  }

  async getBySlugWithSource(slug: string): Promise<CatalogResponse<VideoDetail>> {
    const database = await this.tryLoadVideoFromDatabaseBySlug(slug);
    if (database) {
      return database;
    }

    const runtime = this.runtimeVideos.find((item) => item.slug === slug);
    if (runtime) {
      return {
        data: {
          ...runtime,
          episodes: runtime.type === VideoType.SERIES ? this.runtimeEpisodes.filter((episode) => episode.seriesId === runtime.id) : []
        },
        source: 'runtime',
        warning: 'PostgreSQL catalog is empty or unavailable. Showing runtime-created content.'
      };
    }

    const video = fallbackDemoVideos.find((item) => item.slug === slug);
    if (!video) {
      throw new NotFoundException('Video not found.');
    }

    return {
      data: {
        ...video,
        episodes: video.type === VideoType.SERIES ? fallbackEpisodes.filter((episode) => episode.seriesId === video.id) : []
      },
      source: 'demo',
      warning: 'PostgreSQL catalog is empty or unavailable. Showing demo content instead.'
    };
  }

  async getById(id: string): Promise<VideoRecord> {
    const database = await this.tryLoadVideoFromDatabaseById(id);
    if (database) {
      return database.data;
    }

    const runtime = this.runtimeVideos.find((item) => item.id === id);
    if (runtime) {
      return runtime;
    }

    const video = fallbackDemoVideos.find((item) => item.id === id);
    if (!video) {
      throw new NotFoundException('Video not found.');
    }

    return video;
  }

  async listEpisodes(seriesId: string): Promise<EpisodeSummary[]> {
    const database = await this.tryLoadEpisodesFromDatabase(seriesId);
    if (database) {
      return database.data;
    }

    const runtime = this.runtimeEpisodes.filter((episode) => episode.seriesId === seriesId);
    if (runtime.length > 0) {
      return runtime;
    }

    return fallbackEpisodes.filter((episode) => episode.seriesId === seriesId);
  }

  createVideo(record: {
    id: string;
    slug: string;
    title: string;
    description: string;
    type: VideoType;
    accessTier: VideoAccessTier;
    durationSeconds: number;
    tags: string[];
    thumbnailUrl?: string;
    visibility?: VideoVisibility;
    restrictionReason?: RestrictionReason;
    allowedRegions?: string[];
    requiresVerification?: boolean;
    storage: { masterPath: string; previewPath: string };
  }): VideoRecord {
    const safeSlug = record.slug?.trim() || `video-${record.id}`;
    const video: VideoRecord = {
      ...record,
      previewDurationSeconds: PREVIEW_DURATION_SECONDS,
      thumbnailUrl:
        record.thumbnailUrl ??
        'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=80',
      visibility: record.visibility ?? VideoVisibility.PRIVATE,
      restrictionReason: record.restrictionReason ?? RestrictionReason.NONE,
      allowedRegions: record.allowedRegions ?? [],
      requiresVerification: record.requiresVerification ?? false,
      slug: safeSlug
    };

    this.runtimeVideos.unshift(video);
    return video;
  }

  updateVideo(id: string, patch: Partial<VideoRecord>): VideoRecord {
    const runtime = this.runtimeVideos.find((video) => video.id === id);
    if (runtime) {
      Object.assign(runtime, patch);
      return runtime;
    }

    const fallback = fallbackDemoVideos.find((video) => video.id === id);
    if (fallback) {
      Object.assign(fallback, patch);
      return fallback;
    }

    throw new NotFoundException('Video not found.');
  }

  deleteVideo(id: string): VideoRecord {
    const runtimeIndex = this.runtimeVideos.findIndex((video) => video.id === id);
    if (runtimeIndex !== -1) {
      return this.runtimeVideos.splice(runtimeIndex, 1)[0];
    }

    throw new NotFoundException('Video not found.');
  }

  private async tryLoadCatalogFromDatabase(type?: VideoType): Promise<CatalogResponse<CatalogVideo[]> | null> {
    if (!this.pool) {
      return null;
    }

    try {
      const values: string[] = type ? [type] : [];
      const result = await this.pool.query<VideoListRow>(
        `
          SELECT
            v.id,
            v.slug,
            v.title,
            v.description,
            v.type,
            v.access_tier,
            v.duration_seconds,
            COALESCE(v.thumbnail_url, '') AS thumbnail_url,
            v.preview_duration_seconds,
            COALESCE(v.visibility, false) AS visible_bool,
            COALESCE(v.is_under_review, false) AS is_under_review
          FROM videos v
          WHERE (${type ? 'v.type = $1' : 'TRUE'})
          ORDER BY v.created_at DESC
        `,
        values
      );

      if (result.rows.length === 0) {
        this.logger.warn('Video catalog query returned zero rows. Falling back to runtime/demo catalog.');
        return null;
      }

      return {
        data: result.rows.map((row) => this.mapRowToCatalogVideo(row)),
        source: 'database'
      };
    } catch (error) {
      this.logger.error(`Catalog DB load failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async tryLoadVideoFromDatabaseBySlug(slug: string): Promise<CatalogResponse<VideoDetail> | null> {
    if (!this.pool) {
      return null;
    }

    try {
      const result = await this.pool.query<VideoAssetRow>(
        `
          SELECT
            v.id,
            v.slug,
            v.title,
            v.description,
            v.type,
            v.access_tier,
            v.duration_seconds,
            COALESCE(v.thumbnail_url, '') AS thumbnail_url,
            v.preview_duration_seconds,
            COALESCE(v.visibility, false) AS visible_bool,
            COALESCE(v.is_under_review, false) AS is_under_review,
            va.master_playlist_path,
            va.preview_playlist_path
          FROM videos v
          LEFT JOIN video_assets va ON va.video_id = v.id
          WHERE v.slug = $1
          LIMIT 1
        `,
        [slug]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const episodes = row.type === VideoType.SERIES ? await this.listEpisodes(row.id) : [];
      return {
        data: {
          ...this.mapAssetRowToVideo(row),
          episodes
        },
        source: 'database'
      };
    } catch (error) {
      this.logger.error(`Video-by-slug DB load failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async tryLoadVideoFromDatabaseById(id: string): Promise<CatalogResponse<VideoRecord> | null> {
    if (!this.pool) {
      return null;
    }

    try {
      const result = await this.pool.query<VideoAssetRow>(
        `
          SELECT
            v.id,
            v.slug,
            v.title,
            v.description,
            v.type,
            v.access_tier,
            v.duration_seconds,
            COALESCE(v.thumbnail_url, '') AS thumbnail_url,
            v.preview_duration_seconds,
            COALESCE(v.visibility, false) AS visible_bool,
            COALESCE(v.is_under_review, false) AS is_under_review,
            va.master_playlist_path,
            va.preview_playlist_path
          FROM videos v
          LEFT JOIN video_assets va ON va.video_id = v.id
          WHERE v.id = $1
          LIMIT 1
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return {
        data: this.mapAssetRowToVideo(result.rows[0]),
        source: 'database'
      };
    } catch (error) {
      this.logger.error(`Video-by-id DB load failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async tryLoadEpisodesFromDatabase(seriesId: string): Promise<CatalogResponse<EpisodeSummary[]> | null> {
    if (!this.pool) {
      return null;
    }

    try {
      const result = await this.pool.query<EpisodeRow>(
        `
          SELECT
            id,
            video_id,
            title,
            description,
            duration_seconds,
            season_number,
            episode_number,
            COALESCE(thumbnail_url, '') AS thumbnail_url
          FROM episodes
          WHERE video_id = $1
          ORDER BY season_number ASC, episode_number ASC
        `,
        [seriesId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return {
        data: result.rows.map((row) => ({
          id: row.id,
          seriesId: row.video_id,
          title: row.title,
          description: row.description,
          durationSeconds: row.duration_seconds,
          seasonNumber: row.season_number,
          episodeNumber: row.episode_number,
          thumbnailUrl:
            row.thumbnail_url ||
            'https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=900&q=80'
        })),
        source: 'database'
      };
    } catch (error) {
      this.logger.error(`Episodes DB load failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private mapRowToCatalogVideo(row: VideoListRow): CatalogVideo {
    const visibility = this.toVisibility(row.visible_bool, row.is_under_review);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title?.trim() || this.humanizeSlug(row.slug) || 'Untitled video',
      description: row.description,
      type: row.type,
      accessTier: row.access_tier,
      durationSeconds: row.duration_seconds,
      thumbnailUrl:
        row.thumbnail_url ||
        'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=80',
      tags: [],
      previewDurationSeconds: row.preview_duration_seconds ?? PREVIEW_DURATION_SECONDS,
      visibility,
      restrictionReason: visibility === VideoVisibility.RESTRICTED ? RestrictionReason.DMCA : RestrictionReason.NONE
    };
  }

  private mapAssetRowToVideo(row: VideoAssetRow): VideoRecord {
    const visibility = this.toVisibility(row.visible_bool, row.is_under_review);
    return {
      ...this.mapRowToCatalogVideo(row),
      visibility,
      restrictionReason: visibility === VideoVisibility.RESTRICTED ? RestrictionReason.DMCA : RestrictionReason.NONE,
      storage: {
        masterPath: row.master_playlist_path ?? `videos/${row.id}/index.m3u8`,
        previewPath: row.preview_playlist_path ?? `videos/${row.id}/preview.m3u8`
      }
    };
  }

  private toCatalogVideo(video: VideoRecord): CatalogVideo {
    const { storage, allowedRegions, requiresVerification, ...catalogVideo } = video;
    void storage;
    void allowedRegions;
    void requiresVerification;
    return catalogVideo;
  }

  private toVisibility(visible: boolean, isUnderReview: boolean): VideoVisibility {
    if (isUnderReview) {
      return VideoVisibility.RESTRICTED;
    }

    return visible ? VideoVisibility.PUBLIC : VideoVisibility.PRIVATE;
  }

  private humanizeSlug(slug: string | null | undefined): string {
    if (!slug) {
      return '';
    }

    return slug
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
