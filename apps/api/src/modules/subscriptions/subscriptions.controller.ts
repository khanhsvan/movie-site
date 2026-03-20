import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedViewer } from '@netflix-mini/types';
import { AuthenticatedGuard } from '../../common/guards/authenticated.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, AuthenticatedGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('checkout')
  checkout() {
    return this.subscriptionsService.checkout();
  }

  @Post('portal')
  portal() {
    return this.subscriptionsService.billingPortal();
  }

  @Get('me')
  me(@Req() req: { user: AuthenticatedViewer }) {
    return this.subscriptionsService.current(req.user);
  }
}
