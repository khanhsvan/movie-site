import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedViewer } from '@netflix-mini/types';
import { AuthenticatedGuard } from '../../common/guards/authenticated.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WatchHistoryService } from './watch-history.service';

@Controller('watch-history')
@UseGuards(JwtAuthGuard, AuthenticatedGuard)
export class WatchHistoryController {
  constructor(private readonly watchHistoryService: WatchHistoryService) {}

  @Post()
  saveProgress(
    @Req() req: { user: AuthenticatedViewer },
    @Body() body: { videoId: string; episodeId?: string; progressSeconds: number }
  ) {
    return this.watchHistoryService.saveProgress(req.user.id, body);
  }

  @Get('continue')
  continueWatching(@Req() req: { user: AuthenticatedViewer }) {
    return this.watchHistoryService.continueWatching(req.user.id);
  }
}
