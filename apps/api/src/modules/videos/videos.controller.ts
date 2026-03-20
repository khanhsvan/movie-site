import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ListVideosDto } from './dto/list-videos.dto';
import { VideosService } from './videos.service';
import { Response } from 'express';

@Controller()
@UseGuards(JwtAuthGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get('videos')
  async list(@Query() query: ListVideosDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.videosService.listWithSource(query.type);
    res.setHeader('x-catalog-source', result.source);
    if (result.warning) {
      res.setHeader('x-catalog-warning', encodeURIComponent(result.warning));
    }
    return result.data;
  }

  @Get('videos/:slug')
  async getBySlug(@Param('slug') slug: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.videosService.getBySlugWithSource(slug);
    res.setHeader('x-catalog-source', result.source);
    if (result.warning) {
      res.setHeader('x-catalog-warning', encodeURIComponent(result.warning));
    }
    return result.data;
  }

  @Get('series/:seriesId/episodes')
  async listEpisodes(@Param('seriesId') seriesId: string) {
    return this.videosService.listEpisodes(seriesId);
  }
}
