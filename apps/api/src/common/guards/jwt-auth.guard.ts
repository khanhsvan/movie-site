import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@netflix-mini/types';
import type { Request } from 'express';
import { AuthService } from '../../modules/auth/auth.service';

type RequestWithUser = Request & {
  user?: unknown;
};

const ACCESS_COOKIE = 'sv_access_token';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.getBearerToken(request) ?? this.readCookie(request.headers.cookie, ACCESS_COOKIE);

    if (!token) {
      request.user = {
        role: UserRole.GUEST
      };
      return true;
    }

    try {
      request.user = await this.authService.verifyAccessToken(token);
      return true;
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof Error ? error.message : 'Your session is invalid or has expired.'
      );
    }
  }

  private getBearerToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.slice('Bearer '.length).trim();
  }

  private readCookie(cookieHeader: string | undefined, name: string): string | null {
    if (!cookieHeader) {
      return null;
    }

    const entry = cookieHeader
      .split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${name}=`));

    return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
  }
}
