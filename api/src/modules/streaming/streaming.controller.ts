import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedViewer } from '@netflix-mini/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StreamingService } from './streaming.service';

@Controller('videos')
@UseGuards(JwtAuthGuard)
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Get(':id/playback')
  async playback(
    @Param('id') id: string,
    @Req()
    req: {
      user?: Partial<AuthenticatedViewer>;
      headers?: Record<string, string | string[] | undefined>;
      protocol?: string;
    }
  ) {
    return this.streamingService.authorizePlayback(id, req.user, this.resolveApiBaseUrl(req));
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
