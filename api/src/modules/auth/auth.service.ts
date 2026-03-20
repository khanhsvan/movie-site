import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedViewer } from '@netflix-mini/types';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

type AuthResponse = TokenPair & {
  user: AuthenticatedViewer;
};

type AuthTokenPayload = {
  sub: string;
  email: string;
  role: AuthenticatedViewer['role'];
};

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse & { verificationToken: string | null }> {
    if (this.usersService.findByEmail(dto.email)) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersService.createUser({
      email: dto.email,
      passwordHash,
      name: dto.name,
      acceptedTosVersion: dto.acceptedTosVersion
    });
    this.usersService.touchLogin(user.id);
    const summary = this.usersService.toSummary(user);

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return {
      user: summary,
      ...tokens,
      verificationToken: user.verificationToken ?? null
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    this.logger.log(`Login attempt for ${dto.email}`);
    const user = this.usersService.findByEmail(dto.email);
    if (!user || !(await this.usersService.verifyPassword(user, dto.password))) {
      this.logger.warn(`Login failed for ${dto.email}`);
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.isBanned) {
      throw new UnauthorizedException('This account has been restricted.');
    }

    this.usersService.touchLogin(user.id);
    this.logger.log(`Login succeeded for ${dto.email}`);
    const summary = this.usersService.toSummary(user);
    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return {
      user: summary,
      ...tokens
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const payload = await this.jwtService.verifyAsync<AuthTokenPayload>(refreshToken, {
      secret: this.getRefreshSecret()
    });

    const user = this.usersService.findById(payload.sub);
    if (!user || !(await this.usersService.isRefreshTokenValid(user.id, refreshToken))) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return {
      user: this.usersService.toSummary(user),
      ...tokens
    };
  }

  async logout(refreshToken?: string): Promise<{ success: true }> {
    if (refreshToken) {
      try {
        const payload = await this.jwtService.verifyAsync<AuthTokenPayload>(refreshToken, {
          secret: this.getRefreshSecret()
        });
        this.usersService.revokeRefreshToken(payload.sub);
      } catch {
        // Ignore invalid refresh tokens during logout so the client can still clear cookies.
      }
    }

    return { success: true };
  }

  verifyEmail(token: string) {
    const user = this.usersService.verifyEmailToken(token);
    return {
      verified: Boolean(user),
      user
    };
  }

  async verifyAccessToken(token: string): Promise<AuthenticatedViewer> {
    const payload = await this.jwtService.verifyAsync<AuthTokenPayload>(token, {
      secret: this.getAccessSecret()
    });
    const user = this.usersService.findById(payload.sub);
    if (!user || user.isBanned) {
      throw new UnauthorizedException('User session is not valid.');
    }

    return this.usersService.toSummary(user);
  }

  private async issueTokens(userId: string, email: string, role: AuthenticatedViewer['role']): Promise<TokenPair> {
    const payload: AuthTokenPayload = {
      sub: userId,
      email,
      role
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.getAccessSecret(),
        expiresIn: this.getAccessTokenTtlSeconds()
      }),
      this.jwtService.signAsync(payload, {
        secret: this.getRefreshSecret(),
        expiresIn: this.getRefreshTokenTtlSeconds()
      })
    ]);

    await this.usersService.storeRefreshToken(userId, refreshToken);

    return {
      accessToken,
      refreshToken
    };
  }

  private getAccessSecret(): string {
    return process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
  }

  private getRefreshSecret(): string {
    return process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret';
  }

  private getAccessTokenTtlSeconds(): number {
    return this.parseDurationSeconds(process.env.JWT_ACCESS_TTL, ACCESS_TOKEN_TTL_SECONDS);
  }

  private getRefreshTokenTtlSeconds(): number {
    return this.parseDurationSeconds(process.env.JWT_REFRESH_TTL, REFRESH_TOKEN_TTL_SECONDS);
  }

  private parseDurationSeconds(value: string | undefined, fallbackSeconds: number): number {
    if (!value) {
      return fallbackSeconds;
    }

    const normalized = value.trim().toLowerCase();
    const directNumber = Number(normalized);
    if (Number.isFinite(directNumber) && directNumber > 0) {
      return directNumber;
    }

    const match = normalized.match(/^(\d+)([smhd])$/);
    if (!match) {
      return fallbackSeconds;
    }

    const amount = Number(match[1]);
    const unit = match[2];
    if (unit === 's') {
      return amount;
    }
    if (unit === 'm') {
      return amount * 60;
    }
    if (unit === 'h') {
      return amount * 60 * 60;
    }

    return amount * 24 * 60 * 60;
  }
}
