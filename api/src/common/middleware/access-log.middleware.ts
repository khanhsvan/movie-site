import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AccessAuditService } from '../../modules/audit/access-audit.service';

@Injectable()
export class AccessLogMiddleware implements NestMiddleware {
  constructor(private readonly accessAuditService: AccessAuditService) {}

  use(req: Request & { user?: { id?: string } }, _res: Response, next: NextFunction) {
    if (req.path.includes('/videos/') && req.path.endsWith('/playback')) {
      _res.on('finish', () => {
        const parts = req.path.split('/');
        const videoId = parts[2] ?? 'unknown';
        this.accessAuditService.log({
          videoId,
          userId: req.user?.id ?? null,
          ipAddress: req.ip ?? req.socket.remoteAddress ?? null,
          path: req.path
        });
      });
    }

    next();
  }
}
