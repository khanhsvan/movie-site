import {
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException
} from '@nestjs/common';
import { canAccessVideo } from '@netflix-mini/config';
import {
  AuthenticatedViewer,
  RestrictionReason,
  UserRole,
  VideoAccessTier,
  VideoVisibility
} from '@netflix-mini/types';
import { Client as MinioClient } from 'minio';
import path from 'node:path/posix';
import { Readable } from 'node:stream';
import { ComplianceService } from '../compliance/compliance.service';
import { VideosService } from '../videos/videos.service';

type StreamMode = 'master' | 'preview';

type ProxyStreamResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body?: NodeJS.ReadableStream;
  textBody?: string;
};

type ParsedRange = {
  start: number;
  end: number;
  length: number;
};

const DEMO_STREAMS: Record<string, string> = {
  '__demo__/movie/master.m3u8': 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  '__demo__/movie/preview.m3u8': 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  '__demo__/series/master.m3u8': 'https://test-streams.mux.dev/test_001/stream.m3u8',
  '__demo__/series/preview.m3u8': 'https://test-streams.mux.dev/test_001/stream.m3u8'
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly baseUrl = new URL(process.env.STORAGE_BASE_URL ?? 'http://127.0.0.1:8081');
  private readonly bucketName = process.env.STORAGE_BUCKET ?? 'videos';
  private readonly apiBaseUrl = process.env.API_URL ?? 'http://localhost:4000';
  private readonly minioClient = new MinioClient({
    endPoint: this.baseUrl.hostname,
    port: Number(this.baseUrl.port || (this.baseUrl.protocol === 'https:' ? 443 : 80)),
    useSSL: this.baseUrl.protocol === 'https:',
    accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin'
  });

  constructor(
    private readonly videosService: VideosService,
    private readonly complianceService: ComplianceService
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log(
      `Storage proxy configured for ${this.baseUrl.origin} using bucket "${this.bucketName}" with backend URL ${this.apiBaseUrl}`
    );

    try {
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);
      if (bucketExists) {
        this.logger.log(`Verified access to MinIO bucket "${this.bucketName}".`);
      } else {
        this.logger.warn(`MinIO bucket "${this.bucketName}" does not exist yet. It will be created on first upload.`);
      }
    } catch (error) {
      this.logger.error(
        `Storage connectivity check failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async buildPlayableUrl(videoId: string, kind: StreamMode, apiBaseUrl = this.apiBaseUrl) {
    const storagePath = await this.resolveStoragePath(videoId, kind);
    if (!storagePath) {
      throw new NotFoundException('Storage path not found for video.');
    }

    return {
      url: `${apiBaseUrl}/stream/${videoId}?mode=${kind}`,
      token: 'backend-proxy',
      expiresAt: null as number | null
    };
  }

  async authorizeStream(videoId: string, mode: StreamMode, viewer?: Partial<AuthenticatedViewer>) {
    const video = await this.videosService.getById(videoId);

    if (viewer?.isBanned) {
      throw new ForbiddenException('Your account has been restricted from accessing content.');
    }

    if (this.complianceService.isContentUnderReview(videoId)) {
      throw new ForbiddenException('This title is temporarily unavailable while a copyright claim is under review.');
    }

    const canBypassRestrictions = viewer?.role === UserRole.ADMIN || viewer?.role === UserRole.MODERATOR;
    if (!canBypassRestrictions) {
      if (video.visibility === VideoVisibility.PRIVATE) {
        throw new UnauthorizedException('This video is private.');
      }

      if (video.visibility === VideoVisibility.RESTRICTED) {
        if (video.allowedRegions?.length && (!viewer?.region || !video.allowedRegions.includes(viewer.region))) {
          throw new ForbiddenException('This video is not available in your region.');
        }

        if (video.requiresVerification && !viewer?.verifiedForRestrictedContent) {
          throw new ForbiddenException(
            video.restrictionReason === RestrictionReason.DMCA
              ? 'DMCA-flagged content requires verification before viewing.'
              : 'This restricted content requires additional verification before viewing.'
          );
        }
      }
    }

    const access = canAccessVideo({
      role: viewer?.role,
      subscriptionStatus: viewer?.subscriptionStatus,
      accessTier: video.accessTier as VideoAccessTier
    });

    if (mode === 'master' && !access.allowed) {
      throw new ForbiddenException('You do not have permission to stream this full title.');
    }
  }

  async streamVideoObject(
    videoId: string,
    mode: StreamMode,
    resourcePath: string | undefined,
    range: string | undefined,
    apiBaseUrl = this.apiBaseUrl
  ): Promise<ProxyStreamResponse> {
    try {
      const resolvedPath = await this.resolveRequestedResource(videoId, mode, resourcePath);
      this.logger.log(`Streaming request for ${videoId} (${mode}) using path ${resolvedPath}`);
      const demoUrl = DEMO_STREAMS[resolvedPath];
      if (demoUrl) {
        return this.fetchDemoStream(demoUrl, videoId, mode, resolvedPath, range, apiBaseUrl);
      }

      const objectRef = this.parseStoragePath(resolvedPath);
      const stat = await this.minioClient.statObject(objectRef.bucket, objectRef.objectKey);
      const parsedRange = this.parseRange(range, stat.size);
      const contentType = this.inferContentType(resolvedPath, stat.metaData?.['content-type']);

      if (parsedRange) {
        const stream = await this.minioClient.getPartialObject(
          objectRef.bucket,
          objectRef.objectKey,
          parsedRange.start,
          parsedRange.length
        );

        return {
          statusCode: 206,
          headers: {
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(parsedRange.length),
            'Content-Range': `bytes ${parsedRange.start}-${parsedRange.end}/${stat.size}`,
            'Cache-Control': 'private, max-age=60'
          },
          body: stream
        };
      }

      const stream = await this.minioClient.getObject(objectRef.bucket, objectRef.objectKey);
      if (resolvedPath.endsWith('.m3u8')) {
        const playlist = await this.readStreamAsText(stream);
        const rewritten = this.rewritePlaylist(playlist, videoId, mode, resolvedPath, apiBaseUrl);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(Buffer.byteLength(rewritten)),
            'Cache-Control': 'private, max-age=30'
          },
          textBody: rewritten
        };
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(stat.size),
          'Cache-Control': 'private, max-age=60'
        },
        body: stream
      };
    } catch (error) {
      this.logger.error(
        `Storage stream failed for video ${videoId}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.rethrowStorageError(error);
    }
  }

  async uploadVideoFile(
    storagePath: string,
    file: { buffer: Buffer; size: number; mimeType: string }
  ): Promise<void> {
    try {
      const objectRef = this.parseStoragePath(storagePath);
      this.logger.log(`Uploading video object to MinIO: ${objectRef.bucket}/${objectRef.objectKey}`);
      await this.ensureBucketExists(objectRef.bucket);
      await this.minioClient.putObject(objectRef.bucket, objectRef.objectKey, file.buffer, file.size, {
        'Content-Type': file.mimeType
      });
    } catch (error) {
      this.logger.error(
        `Storage upload failed for ${storagePath}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.rethrowStorageError(error);
    }
  }

  buildObjectPath(...segments: string[]): string {
    return [this.bucketName, ...segments].join('/').replace(/\/+/g, '/');
  }

  rewritePlaylist(
    playlist: string,
    videoId: string,
    mode: StreamMode,
    currentStoragePath: string,
    apiBaseUrl = this.apiBaseUrl
  ) {
    const currentDirectory = path.dirname(currentStoragePath);

    return playlist
      .split(/\r?\n/)
      .map((line) => {
        if (!line || line.startsWith('#') || line.startsWith('http')) {
          return line;
        }

        const resolvedPath = path.normalize(path.join(currentDirectory, line));
        return `${apiBaseUrl}/stream/${videoId}/${resolvedPath}?mode=${mode}`;
      })
      .join('\n');
  }

  async resolveStoragePath(videoId: string, kind: StreamMode) {
    const video = (await this.videosService.getById(videoId)) as {
      storage?: { masterPath: string; previewPath: string };
    };

    return kind === 'preview' ? video.storage?.previewPath : video.storage?.masterPath;
  }

  private async resolveRequestedResource(videoId: string, mode: StreamMode, requestedPath?: string) {
    if (requestedPath) {
      return path.normalize(requestedPath);
    }

    const storagePath = await this.resolveStoragePath(videoId, mode);
    if (!storagePath) {
      throw new NotFoundException('Storage path not found for video.');
    }

    return storagePath;
  }

  private parseStoragePath(storagePath: string) {
    const segments = storagePath.split('/').filter(Boolean);
    if (segments.length < 2) {
      throw new NotFoundException(`Storage path is invalid: ${storagePath}`);
    }

    return {
      bucket: segments[0],
      objectKey: segments.slice(1).join('/')
    };
  }

  private parseRange(rangeHeader: string | undefined, totalSize: number): ParsedRange | null {
    if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
      return null;
    }

    const [startText, endText] = rangeHeader.replace('bytes=', '').split('-');
    const start = Number(startText);
    const end = endText ? Number(endText) : totalSize - 1;

    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || end >= totalSize) {
      throw new ForbiddenException('Invalid byte range requested.');
    }

    return {
      start,
      end,
      length: end - start + 1
    };
  }

  private inferContentType(resourcePath: string, reportedType?: string) {
    if (reportedType) {
      return reportedType;
    }
    if (resourcePath.endsWith('.m3u8')) {
      return 'application/vnd.apple.mpegurl';
    }
    if (resourcePath.endsWith('.ts')) {
      return 'video/mp2t';
    }
    if (resourcePath.endsWith('.mp4')) {
      return 'video/mp4';
    }
    return 'application/octet-stream';
  }

  private async fetchDemoStream(
    demoUrl: string,
    videoId: string,
    mode: StreamMode,
    resourcePath: string,
    range: string | undefined,
    apiBaseUrl: string
  ): Promise<ProxyStreamResponse> {
    const response = await fetch(demoUrl, {
      headers: range ? { Range: range } : undefined
    });

    if (!response.ok && response.status !== 206) {
      throw new NotFoundException(`Demo stream not reachable: ${resourcePath}`);
    }

    const contentType = this.inferContentType(resourcePath, response.headers.get('content-type') ?? undefined);
    if (resourcePath.endsWith('.m3u8')) {
      const playlist = await response.text();
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, max-age=30'
        },
        textBody: this.rewritePlaylist(playlist, videoId, mode, resourcePath, apiBaseUrl)
      };
    }

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': contentType,
        'Accept-Ranges': response.headers.get('accept-ranges') ?? 'bytes',
        'Content-Length': response.headers.get('content-length') ?? '',
        'Content-Range': response.headers.get('content-range') ?? '',
        'Cache-Control': 'private, max-age=60'
      },
      body: response.body ? Readable.fromWeb(response.body as never) : undefined
    };
  }

  private async readStreamAsText(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      stream.on('error', reject);
    });
  }

  private async ensureBucketExists(bucket: string) {
    const exists = await this.minioClient.bucketExists(bucket);
    if (!exists) {
      await this.minioClient.makeBucket(bucket);
    }
  }

  private rethrowStorageError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);

    if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN/i.test(message)) {
      throw new InternalServerErrorException('Storage server is unavailable. Please verify STORAGE_BASE_URL and MinIO connectivity.');
    }

    if (/NoSuchKey|NotFound|does not exist/i.test(message)) {
      throw new NotFoundException('The requested video file could not be found in storage.');
    }

    throw new InternalServerErrorException('Storage request failed unexpectedly.');
  }
}
