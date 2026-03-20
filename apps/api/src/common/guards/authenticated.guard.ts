import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@netflix-mini/types';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: { id?: string; role?: UserRole } }>();
    const user = request.user;

    if (!user?.id || user.role === UserRole.GUEST) {
      throw new UnauthorizedException('You must be signed in to access this resource.');
    }

    return true;
  }
}
