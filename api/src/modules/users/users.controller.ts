import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedViewer } from '@netflix-mini/types';
import { AuthenticatedGuard } from '../../common/guards/authenticated.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, AuthenticatedGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@Req() req: { user: AuthenticatedViewer }) {
    return this.usersService.me(req.user.id);
  }

  @Patch('me')
  update(@Req() req: { user: AuthenticatedViewer }, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }
}
