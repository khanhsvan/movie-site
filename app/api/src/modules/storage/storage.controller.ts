import { Controller, Get, Headers, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthenticatedViewer } from '@netflix-mini/types';
import type { Response } from 'express';
import { Readable } from 'node:stream';
import { AccessAuditService } from '../audit/access-audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StorageService } from './storage.service';

type StreamMode = 'master' | 'preview';

@Controller()
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    private readonly accessAuditService: AccessAuditService
  ) {}

  @Get('video/:id')
  @UseGuards(JwtAuthGuard)
  async video(
    @Param('id') id: string,
    @Req()
    req: {
      user?: Partial<AuthenticatedViewer>;
      headers?: Record<string, string | string[] | undefined>;
      protocol?: string;
    }
  ) {
    const mode = await this.getAllowedMode(id, req.user);
    const asset = await this.storageService.buildPlayableUrl(id, mode, this.resolveApiBaseUrl(req));
    return {
      id,
      playableUrl: asset.url,
      mode
    };
  }

  @Get('stream/:id')
  @UseGuards(JwtAuthGuard)
  async streamDefault(
    @Param('id') id: string,
    @Query('mode') mode: StreamMode | undefined,
    @Headers('range') range: string | undefined,
    @Req()
    req: {
      user?: Partial<AuthenticatedViewer>;
      ip?: string;
      originalUrl?: string;
      headers?: Record<string, string | string[] | undefined>;
      protocol?: string;
    },
    @Res() res: Response
  ) {
    return this.pipeStorageResponse(id, undefined, mode ?? 'master', range, req, res);
  }

  @Get('stream/:id/*path')
  @UseGuards(JwtAuthGuard)
  async streamPath(
    @Param('id') id: string,
    @Req()
    req: {
      params: { path: string };
      user?: Partial<AuthenticatedViewer>;
      ip?: string;
      originalUrl?: string;
      headers?: Record<string, string | string[] | undefined>;
      protocol?: string;
    },
    @Query('mode') mode: StreamMode | undefined,
    @Headers('range') range: string | undefined,
    @Res() res: Response
  ) {
    return this.pipeStorageResponse(id, req.params.path, mode ?? 'master', range, req, res);
  }

  private async pipeStorageResponse(
    videoId: string,
    resourcePath: string | undefined,
    mode: StreamMode,
    range: string | undefined,
    req: {
      user?: Partial<AuthenticatedViewer>;
      ip?: string;
      originalUrl?: string;
      headers?: Record<string, string | string[] | undefined>;
      protocol?: string;
    },
    res: Response
  ) {
    await this.storageService.authorizeStream(videoId, mode, req.user);
    const upstream = await this.storageService.streamVideoObject(
      videoId,
      mode,
      resourcePath,
      range,
      this.resolveApiBaseUrl(req)
    );

    if (!resourcePath) {
      this.accessAuditService.log({
        videoId,
        userId: req.user?.id ?? null,
        ipAddress: req.ip ?? null,
        path: req.originalUrl ?? `/stream/${videoId}?mode=${mode}`
      });
    }

    res.status(upstream.statusCode);
    Object.entries(upstream.headers).forEach(([key, value]) => {
      if (value) {
        res.setHeader(key, value);
      }
    });

    if (upstream.textBody !== undefined) {
      return res.send(upstream.textBody);
    }

    if (!upstream.body) {
      return res.end();
    }

    return (upstream.body as Readable).pipe(res);
  }

  private async getAllowedMode(videoId: string, viewer?: Partial<AuthenticatedViewer>): Promise<StreamMode> {
    try {
      await this.storageService.authorizeStream(videoId, 'master', viewer);
      return 'master';
    } catch {
      await this.storageService.authorizeStream(videoId, 'preview', viewer);
      return 'preview';
    }
  }

  private resolveApiBaseUrl(req: { headers?: Record<string, string | string[] | undefined>; protocol?: string }) {
    const publicApiBaseHeader = req.headers?.['x-public-api-base'];
    const publicApiBase = Array.isArray(publicApiBaseHeader) ? publicApiBaseHeader[0] : publicApiBaseHeader;
    if (publicApiBase) {
      return publicApiBase;
    }

    const forwardedHostHeader = req.headers?.['x-forwarded-host'];
    const forwardedProto = req.headers?.['x-forwarded-proto'];
    const host = Array.isArray(forwardedHostHeader)
      ? forwardedHostHeader[0]
      : forwardedHostHeader || (Array.isArray(req.headers?.host) ? req.headers.host[0] : req.headers?.host);
    const protocol = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : forwardedProto || req.protocol || 'http';
    return host ? `${protocol}://${host}` : 'http://localhost:4000';
  }
}
