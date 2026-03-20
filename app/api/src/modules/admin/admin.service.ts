import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import {
  RestrictionReason,
  UserPermission,
  UserRole,
  VideoAccessTier,
  VideoType,
  VideoVisibility
} from '@netflix-mini/types';
import { StorageService } from '../storage/storage.service';
import { UsersService } from '../users/users.service';
import { VideosService } from '../videos/videos.service';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { CreateVideoDto } from './dto/create-video.dto';
import { UploadRequestDto } from './dto/upload-request.dto';

type AdminVideoRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: VideoType;
  access_tier: VideoAccessTier;
  duration_seconds: number;
  preview_duration_seconds: number;
  thumbnail_url: string | null;
  visible_bool: boolean;
  is_under_review: boolean;
  master_playlist_path: string | null;
  preview_playlist_path: string | null;
};

type AdminVideoRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: VideoType;
  accessTier: VideoAccessTier;
  durationSeconds: number;
  previewDurationSeconds: number;
  thumbnailUrl: string;
  visibility: VideoVisibility;
  restrictionReason: RestrictionReason;
  storage: {
    masterPath: string;
    previewPath: string;
  };
};

type EpisodeRow = {
  id: string;
  video_id: string;
  title: string;
  description: string;
  duration_seconds: number;
  season_number: number;
  episode_number: number;
  thumbnail_url: string | null;
  master_playlist_path: string | null;
  preview_playlist_path: string | null;
};

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly pool?: Pool;

  constructor(
    private readonly videosService: VideosService,
    private readonly usersService: UsersService,
    private readonly storageService: StorageService
  ) {
    if (process.env.DATABASE_URL) {
      this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
      this.pool.on('error', (error) => {
        this.logger.error(`PostgreSQL admin pool error: ${error.message}`);
      });
    }
  }

  async listVideos(): Promise<AdminVideoRecord[]> {
    if (!this.pool) {
      const videos = await this.videosService.list();
      return videos.map((video) => ({
        id: video.id,
        slug: video.slug,
        title: video.title,
        description: video.description,
        type: video.type,
        accessTier: video.accessTier,
        durationSeconds: video.durationSeconds,
        previewDurationSeconds: video.previewDurationSeconds,
        thumbnailUrl: video.thumbnailUrl,
        visibility: video.visibility ?? VideoVisibility.PRIVATE,
        restrictionReason: video.restrictionReason ?? RestrictionReason.NONE,
        storage: {
          masterPath: this.storageService.buildObjectPath('library', video.id, 'source.mp4'),
          previewPath: this.storageService.buildObjectPath('library', video.id, 'source.mp4')
        }
      }));
    }

    const result = await this.pool.query<AdminVideoRow>(
      `
        SELECT
          v.id,
          v.slug,
          v.title,
          v.description,
          v.type,
          v.access_tier,
          v.duration_seconds,
          v.preview_duration_seconds,
          v.thumbnail_url,
          COALESCE(v.visibility, false) AS visible_bool,
          COALESCE(v.is_under_review, false) AS is_under_review,
          va.master_playlist_path,
          va.preview_playlist_path
        FROM videos v
        LEFT JOIN video_assets va ON va.video_id = v.id
        ORDER BY v.created_at DESC
      `
    );

    return result.rows.map((row) => this.mapDbVideo(row));
  }

  async createVideo(dto: CreateVideoDto): Promise<AdminVideoRecord> {
    if (!this.pool) {
      const id = `vid_admin_${Date.now()}`;
      const slug = this.slugify(dto.title);

      return this.videosService.createVideo({
        id,
        slug,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        accessTier: dto.accessTier,
        durationSeconds: dto.durationSeconds,
        tags: dto.tags ?? [],
        thumbnailUrl: dto.thumbnailUrl,
        visibility: dto.visibility ?? VideoVisibility.PRIVATE,
        restrictionReason: dto.restrictionReason ?? RestrictionReason.NONE,
        allowedRegions: dto.allowedRegions ?? [],
        requiresVerification: dto.requiresVerification ?? false,
        storage: {
          masterPath: this.storageService.buildObjectPath('library', id, 'source.mp4'),
          previewPath: this.storageService.buildObjectPath('library', id, 'source.mp4')
        }
      });
    }

    const id = randomUUID();
    const slug = await this.buildUniqueSlug(dto.title);
    const visibility = dto.visibility ?? VideoVisibility.PRIVATE;
    const previewDurationSeconds = 180;

    await this.pool.query(
      `
        INSERT INTO videos (
          id,
          slug,
          title,
          description,
          type,
          access_tier,
          category,
          duration_seconds,
          preview_duration_seconds,
          thumbnail_url,
          visibility,
          processing_status,
          is_under_review,
          published_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'General', $7, $8, $9, $10, 'PENDING', $11, NULL)
      `,
      [
        id,
        slug,
        dto.title,
        dto.description,
        dto.type,
        dto.accessTier,
        dto.durationSeconds,
        previewDurationSeconds,
        dto.thumbnailUrl ?? null,
        visibility === VideoVisibility.PUBLIC,
        visibility === VideoVisibility.RESTRICTED
      ]
    );

    await this.pool.query(
      `
        INSERT INTO video_assets (
          id,
          video_id,
          source_path,
          master_playlist_path,
          preview_playlist_path,
          storage_auth_type
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        randomUUID(),
        id,
        this.storageService.buildObjectPath('library', id, 'source.mp4'),
        this.storageService.buildObjectPath('library', id, 'source.mp4'),
        this.storageService.buildObjectPath('library', id, 'source.mp4'),
        process.env.STORAGE_AUTH_TYPE ?? 'token'
      ]
    );

    return {
      id,
      slug,
      title: dto.title,
      description: dto.description,
      type: dto.type,
      accessTier: dto.accessTier,
      durationSeconds: dto.durationSeconds,
      previewDurationSeconds,
      thumbnailUrl: dto.thumbnailUrl ?? '',
      visibility,
      restrictionReason: visibility === VideoVisibility.RESTRICTED ? dto.restrictionReason ?? RestrictionReason.DMCA : RestrictionReason.NONE,
      storage: {
        masterPath: this.storageService.buildObjectPath('library', id, 'source.mp4'),
        previewPath: this.storageService.buildObjectPath('library', id, 'source.mp4')
      }
    };
  }

  createUploadUrl(videoId: string, dto: UploadRequestDto) {
    const sessionId = `upload_${Date.now()}`;
    const expiresAt = Math.floor(Date.now() / 1000) + 600;
    const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
    const extension = this.extractExtension(dto.fileName, dto.mimeType);
    const objectPath = this.storageService.buildObjectPath('library', videoId, `source.${extension}`);

    return {
      videoId,
      uploadSessionId: sessionId,
      uploadUrl: `${apiUrl}/admin/videos/${videoId}/upload`,
      objectKey: objectPath,
      chunkSizeBytes: 5 * 1024 * 1024,
      resumable: true,
      expiresAt,
      requiredHeaders: {
        Cookie: 'Uses the current authenticated admin session',
        'x-upload-token': sessionId
      }
    };
  }

  async uploadVideoFile(
    videoId: string,
    file: { originalname: string; mimetype: string; buffer: Buffer; size: number }
  ) {
    const extension = this.extractExtension(file.originalname, file.mimetype);
    const objectPath = this.storageService.buildObjectPath('library', videoId, `source.${extension}`);

    await this.storageService.uploadVideoFile(objectPath, {
      buffer: file.buffer,
      size: file.size,
      mimeType: file.mimetype
    });

    if (this.pool) {
      await this.pool.query(
        `
          UPDATE video_assets
          SET source_path = $2,
              master_playlist_path = $2,
              preview_playlist_path = $2,
              updated_at = NOW()
          WHERE video_id = $1
        `,
        [videoId, objectPath]
      );
    } else {
      this.videosService.updateVideo(videoId, {
        storage: {
          masterPath: objectPath,
          previewPath: objectPath
        }
      } as never);
    }

    return {
      uploaded: true,
      videoId,
      objectPath
    };
  }

  async uploadEpisodeFile(
    episodeId: string,
    file: { originalname: string; mimetype: string; buffer: Buffer; size: number }
  ) {
    if (!this.pool) {
      return {
        uploaded: false,
        episodeId,
        message: 'Episode media upload is only available when the database-backed mode is enabled.'
      };
    }

    const episodeResult = await this.pool.query<{ id: string; video_id: string }>(
      `
        SELECT id, video_id
        FROM episodes
        WHERE id = $1
        LIMIT 1
      `,
      [episodeId]
    );

    if (episodeResult.rows.length === 0) {
      throw new Error('Episode not found.');
    }

    const episode = episodeResult.rows[0];
    const extension = this.extractExtension(file.originalname, file.mimetype);
    const objectPath = this.storageService.buildObjectPath('library', episode.video_id, 'episodes', episodeId, `source.${extension}`);

    await this.storageService.uploadVideoFile(objectPath, {
      buffer: file.buffer,
      size: file.size,
      mimeType: file.mimetype
    });

    await this.pool.query(
      `
        UPDATE video_assets
        SET source_path = $2,
            master_playlist_path = $2,
            preview_playlist_path = $2,
            updated_at = NOW()
        WHERE episode_id = $1
      `,
      [episodeId, objectPath]
    );

    return {
      uploaded: true,
      episodeId,
      objectPath
    };
  }

  async publish(videoId: string) {
    if (this.pool) {
      await this.pool.query(
        `
          UPDATE videos
          SET processing_status = 'READY',
              published_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
        `,
        [videoId]
      );
    }

    return {
      videoId,
      published: true,
      playback: await this.storageService.buildPlayableUrl(videoId, 'master')
    };
  }

  async updateVideo(videoId: string, dto: Partial<CreateVideoDto>): Promise<AdminVideoRecord> {
    if (!this.pool) {
      return this.videosService.updateVideo(videoId, dto as never);
    }

    const existing = await this.findDbVideo(videoId);
    const visibility = dto.visibility ?? existing.visibility;
    const nextSlug = dto.title && dto.title !== existing.title ? await this.buildUniqueSlug(dto.title, videoId) : existing.slug;

    await this.pool.query(
      `
        UPDATE videos
        SET slug = $2,
            title = $3,
            description = $4,
            type = $5,
            access_tier = $6,
            duration_seconds = $7,
            thumbnail_url = $8,
            visibility = $9,
            is_under_review = $10,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        videoId,
        nextSlug,
        dto.title ?? existing.title,
        dto.description ?? existing.description,
        dto.type ?? existing.type,
        dto.accessTier ?? existing.accessTier,
        dto.durationSeconds ?? existing.durationSeconds,
        dto.thumbnailUrl ?? existing.thumbnailUrl,
        visibility === VideoVisibility.PUBLIC,
        visibility === VideoVisibility.RESTRICTED
      ]
    );

    await this.pool.query(
      `
        UPDATE video_assets
        SET master_playlist_path = $2,
            preview_playlist_path = $3,
            updated_at = NOW()
        WHERE video_id = $1
      `,
      [videoId, existing.storage.masterPath, existing.storage.previewPath]
    );

    return {
      ...existing,
      slug: nextSlug,
      title: dto.title ?? existing.title,
      description: dto.description ?? existing.description,
      type: dto.type ?? existing.type,
      accessTier: dto.accessTier ?? existing.accessTier,
      durationSeconds: dto.durationSeconds ?? existing.durationSeconds,
      thumbnailUrl: dto.thumbnailUrl ?? existing.thumbnailUrl,
      visibility,
      restrictionReason:
        visibility === VideoVisibility.RESTRICTED
          ? dto.restrictionReason ?? existing.restrictionReason
          : RestrictionReason.NONE
    };
  }

  async deleteVideo(videoId: string) {
    if (!this.pool) {
      return {
        deleted: true,
        videoId,
        record: this.videosService.deleteVideo(videoId)
      };
    }

    const existing = await this.findDbVideo(videoId);
    await this.pool.query(`DELETE FROM videos WHERE id = $1`, [videoId]);

    return {
      deleted: true,
      videoId,
      record: existing
    };
  }

  async createEpisode(dto: CreateEpisodeDto) {
    if (!this.pool) {
      return {
        id: `ep_admin_${Date.now()}`,
        ...dto,
        storage: {
          masterPath: this.storageService.buildObjectPath('library', dto.seriesId, 'episodes', `ep_admin_${Date.now()}`, 'source.mp4'),
          previewPath: this.storageService.buildObjectPath('library', dto.seriesId, 'episodes', `ep_admin_${Date.now()}`, 'source.mp4')
        }
      };
    }

    const series = await this.findDbVideo(dto.seriesId);
    if (series.type !== VideoType.SERIES) {
      throw new Error('Episodes can only be added to series titles.');
    }

    const episodeId = randomUUID();
    const objectPath = this.storageService.buildObjectPath('library', dto.seriesId, 'episodes', episodeId, 'source.mp4');

    await this.pool.query(
      `
        INSERT INTO episodes (
          id,
          video_id,
          title,
          description,
          duration_seconds,
          season_number,
          episode_number,
          thumbnail_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        episodeId,
        dto.seriesId,
        dto.title,
        dto.description,
        dto.durationSeconds,
        dto.seasonNumber,
        dto.episodeNumber,
        dto.thumbnailUrl ?? null
      ]
    );

    await this.pool.query(
      `
        INSERT INTO video_assets (
          id,
          video_id,
          episode_id,
          source_path,
          master_playlist_path,
          preview_playlist_path,
          storage_auth_type
        ) VALUES ($1, $2, $3, $4, $4, $4, $5)
      `,
      [
        randomUUID(),
        dto.seriesId,
        episodeId,
        objectPath,
        process.env.STORAGE_AUTH_TYPE ?? 'token'
      ]
    );

    return {
      id: episodeId,
      seriesId: dto.seriesId,
      title: dto.title,
      description: dto.description,
      durationSeconds: dto.durationSeconds,
      seasonNumber: dto.seasonNumber,
      episodeNumber: dto.episodeNumber,
      thumbnailUrl: dto.thumbnailUrl ?? '',
      storage: {
        masterPath: objectPath,
        previewPath: objectPath
      }
    };
  }

  async listSeriesOptions() {
    const videos = await this.listVideos();
    return videos
      .filter((video) => video.type === VideoType.SERIES)
      .map((video) => ({
        id: video.id,
        title: video.title,
        slug: video.slug
      }));
  }

  listUsers() {
    return this.usersService.listUsers();
  }

  updateUser(userId: string, payload: Record<string, unknown>) {
    return this.usersService.updateUser(userId, payload as {
      role?: UserRole;
      permissions?: UserPermission[];
      isBanned?: boolean;
      verifiedForRestrictedContent?: boolean;
      region?: string;
    });
  }

  private mapDbVideo(row: AdminVideoRow): AdminVideoRecord {
    const visibility = row.is_under_review ? VideoVisibility.RESTRICTED : row.visible_bool ? VideoVisibility.PUBLIC : VideoVisibility.PRIVATE;
    return {
      id: row.id,
      slug: row.slug,
      title: row.title?.trim() || this.humanizeSlug(row.slug) || 'Untitled video',
      description: row.description,
      type: row.type,
      accessTier: row.access_tier,
      durationSeconds: row.duration_seconds,
      previewDurationSeconds: row.preview_duration_seconds,
      thumbnailUrl: row.thumbnail_url ?? '',
      visibility,
      restrictionReason: visibility === VideoVisibility.RESTRICTED ? RestrictionReason.DMCA : RestrictionReason.NONE,
      storage: {
        masterPath: row.master_playlist_path ?? `videos/${row.id}/index.m3u8`,
        previewPath: row.preview_playlist_path ?? `videos/${row.id}/preview.m3u8`
      }
    };
  }

  private async findDbVideo(videoId: string): Promise<AdminVideoRecord> {
    if (!this.pool) {
      throw new Error('Database is not configured.');
    }

    const result = await this.pool.query<AdminVideoRow>(
      `
        SELECT
          v.id,
          v.slug,
          v.title,
          v.description,
          v.type,
          v.access_tier,
          v.duration_seconds,
          v.preview_duration_seconds,
          v.thumbnail_url,
          COALESCE(v.visibility, false) AS visible_bool,
          COALESCE(v.is_under_review, false) AS is_under_review,
          va.master_playlist_path,
          va.preview_playlist_path
        FROM videos v
        LEFT JOIN video_assets va ON va.video_id = v.id
        WHERE v.id = $1
        LIMIT 1
      `,
      [videoId]
    );

    if (result.rows.length === 0) {
      throw new Error('Video not found.');
    }

    return this.mapDbVideo(result.rows[0]);
  }

  private async buildUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const base = this.slugify(title) || `video-${Date.now()}`;
    if (!this.pool) {
      return base;
    }

    let candidate = base;
    let counter = 1;

    while (true) {
      const values = excludeId ? [candidate, excludeId] : [candidate];
      const sql = excludeId
        ? 'SELECT 1 FROM videos WHERE slug = $1 AND id <> $2 LIMIT 1'
        : 'SELECT 1 FROM videos WHERE slug = $1 LIMIT 1';
      const result = await this.pool.query(sql, values);
      if (result.rows.length === 0) {
        return candidate;
      }

      counter += 1;
      candidate = `${base}-${counter}`;
    }
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private extractExtension(fileName: string, mimeType: string): string {
    const normalized = fileName.toLowerCase();
    if (normalized.endsWith('.m3u8')) {
      return 'm3u8';
    }
    if (normalized.endsWith('.mp4')) {
      return 'mp4';
    }
    if (mimeType.includes('mpegurl')) {
      return 'm3u8';
    }

    return 'mp4';
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
