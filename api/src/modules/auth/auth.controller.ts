import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto';

const ACCESS_COOKIE = 'sv_access_token';
const REFRESH_COOKIE = 'sv_refresh_token';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.register(dto);
    this.setSessionCookies(response, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(dto);
    this.setSessionCookies(response, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const cookieToken = this.readCookie(request.headers.cookie, REFRESH_COOKIE);
    const result = await this.authService.refresh(dto.refreshToken || cookieToken || '');
    this.setSessionCookies(response, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = this.readCookie(request.headers.cookie, REFRESH_COOKIE);
    await this.authService.logout(refreshToken ?? undefined);
    response.clearCookie(ACCESS_COOKIE, { path: '/' });
    response.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { success: true };
  }

  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  private setSessionCookies(response: Response, accessToken: string, refreshToken: string) {
    const secure = process.env.NODE_ENV === 'production';
    response.cookie(ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000
    });
    response.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
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
