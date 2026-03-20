import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@netflix-mini/types';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedGuard } from '../../common/guards/authenticated.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AnalyticsService } from './analytics.service';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, AuthenticatedGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  overview() {
    return this.analyticsService.overview();
  }
}
