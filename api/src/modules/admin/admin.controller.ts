import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { UserRole } from '@netflix-mini/types';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedGuard } from '../../common/guards/authenticated.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { CreateVideoDto } from './dto/create-video.dto';
import { UploadRequestDto } from './dto/upload-request.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AuthenticatedGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('videos')
  async listVideos() {
    return this.adminService.listVideos();
  }

  @Get('series')
  async listSeriesOptions() {
    return this.adminService.listSeriesOptions();
  }

  @Post('videos')
  async createVideo(@Body() dto: CreateVideoDto) {
    return this.adminService.createVideo(dto);
  }

  @Post('videos/:id/upload-url')
  createUploadUrl(@Param('id') id: string, @Body() dto: UploadRequestDto) {
    return this.adminService.createUploadUrl(id, dto);
  }

  @Post('videos/:id/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined
  ) {
    if (!file) {
      return {
        uploaded: false,
        message: 'No file was uploaded.'
      };
    }

    return this.adminService.uploadVideoFile(id, file);
  }

  @Post('episodes/:id/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadEpisodeFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined
  ) {
    if (!file) {
      return {
        uploaded: false,
        message: 'No file was uploaded.'
      };
    }

    return this.adminService.uploadEpisodeFile(id, file);
  }

  @Post('videos/:id/publish')
  async publish(@Param('id') id: string) {
    return this.adminService.publish(id);
  }

  @Patch('videos/:id')
  async updateVideo(@Param('id') id: string, @Body() dto: Partial<CreateVideoDto>) {
    return this.adminService.updateVideo(id, dto);
  }

  @Delete('videos/:id')
  async deleteVideo(@Param('id') id: string) {
    return this.adminService.deleteVideo(id);
  }

  @Post('episodes')
  createEpisode(@Body() dto: CreateEpisodeDto) {
    return this.adminService.createEpisode(dto);
  }

  @Get('users')
  @Roles(UserRole.ADMIN)
  listUsers() {
    return this.adminService.listUsers();
  }

  @Patch('users/:id')
  @Roles(UserRole.ADMIN)
  updateUser(@Param('id') id: string, @Body() payload: Record<string, unknown>) {
    return this.adminService.updateUser(id, payload);
  }
}
