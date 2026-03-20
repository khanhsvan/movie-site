import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthenticatedViewer, SubscriptionStatus, UserPermission, UserRole, UserSummary } from '@netflix-mini/types';
import { UpdateProfileDto } from './dto/update-profile.dto';

type UserRecord = AuthenticatedViewer & {
  passwordHash: string;
  refreshTokenHash?: string | null;
  verificationToken?: string | null;
  activityCount: number;
};

type CreateUserInput = {
  email: string;
  passwordHash: string;
  name?: string;
  acceptedTosVersion: string;
};

const DEFAULT_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD ?? 'Admin@123456';
const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@streamvault.local';
const DEFAULT_MODERATOR_EMAIL = process.env.DEFAULT_MODERATOR_EMAIL ?? 'moderator@streamvault.local';
const DEFAULT_USER_EMAIL = process.env.DEFAULT_USER_EMAIL ?? 'user@streamvault.local';

const users: UserRecord[] = [
  {
    id: 'user_demo_1',
    email: DEFAULT_USER_EMAIL,
    name: 'Demo User',
    role: UserRole.USER,
    isEmailVerified: true,
    subscriptionStatus: SubscriptionStatus.ACTIVE,
    acceptedTosVersion: '2026.03',
    acceptedTosAt: '2026-03-18T00:00:00.000Z',
    permissions: [UserPermission.VIEW],
    isBanned: false,
    activityCount: 16,
    verifiedForRestrictedContent: false,
    region: 'VN',
    passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
    refreshTokenHash: null,
    verificationToken: null
  },
  {
    id: 'moderator_demo_1',
    email: DEFAULT_MODERATOR_EMAIL,
    name: 'Moderator',
    role: UserRole.MODERATOR,
    isEmailVerified: true,
    subscriptionStatus: null,
    acceptedTosVersion: '2026.03',
    acceptedTosAt: '2026-03-18T00:00:00.000Z',
    permissions: [UserPermission.VIEW, UserPermission.MODERATE, UserPermission.EDIT],
    isBanned: false,
    activityCount: 42,
    verifiedForRestrictedContent: true,
    region: 'VN',
    passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
    refreshTokenHash: null,
    verificationToken: null
  },
  {
    id: 'admin_demo_1',
    email: DEFAULT_ADMIN_EMAIL,
    name: 'Platform Admin',
    role: UserRole.ADMIN,
    isEmailVerified: true,
    subscriptionStatus: null,
    acceptedTosVersion: '2026.03',
    acceptedTosAt: '2026-03-18T00:00:00.000Z',
    permissions: [
      UserPermission.VIEW,
      UserPermission.EDIT,
      UserPermission.UPLOAD,
      UserPermission.DELETE,
      UserPermission.MODERATE
    ],
    isBanned: false,
    activityCount: 88,
    verifiedForRestrictedContent: true,
    region: 'VN',
    passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
    refreshTokenHash: null,
    verificationToken: null
  }
];

@Injectable()
export class UsersService {
  me(userId: string): AuthenticatedViewer {
    return this.toSummary(this.requireUser(userId));
  }

  updateProfile(userId: string, dto: UpdateProfileDto): AuthenticatedViewer {
    const user = this.requireUser(userId);
    Object.assign(user, dto);
    return this.toSummary(user);
  }

  listUsers(): AuthenticatedViewer[] {
    return users.map((user) => this.toSummary(user));
  }

  updateUser(
    userId: string,
    payload: Partial<Pick<UserRecord, 'role' | 'permissions' | 'isBanned' | 'verifiedForRestrictedContent' | 'region'>>
  ): AuthenticatedViewer {
    const user = this.requireUser(userId);
    Object.assign(user, payload);
    return this.toSummary(user);
  }

  findByEmail(email: string): UserRecord | undefined {
    return users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  }

  findById(userId: string): UserRecord | undefined {
    return users.find((entry) => entry.id === userId);
  }

  createUser(input: CreateUserInput): UserRecord {
    const user: UserRecord = {
      id: `user_${Date.now()}`,
      email: input.email,
      name: input.name ?? null,
      role: UserRole.USER,
      isEmailVerified: false,
      subscriptionStatus: null,
      acceptedTosVersion: input.acceptedTosVersion,
      acceptedTosAt: new Date().toISOString(),
      permissions: [UserPermission.VIEW],
      isBanned: false,
      activityCount: 0,
      verifiedForRestrictedContent: false,
      region: 'VN',
      passwordHash: input.passwordHash,
      refreshTokenHash: null,
      verificationToken: `verify_${Date.now()}`,
    };

    users.unshift(user);
    return user;
  }

  async verifyPassword(user: UserRecord, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const user = this.requireUser(userId);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  }

  async isRefreshTokenValid(userId: string, refreshToken: string): Promise<boolean> {
    const user = this.requireUser(userId);
    if (!user.refreshTokenHash) {
      return false;
    }

    return bcrypt.compare(refreshToken, user.refreshTokenHash);
  }

  revokeRefreshToken(userId: string): void {
    const user = this.requireUser(userId);
    user.refreshTokenHash = null;
  }

  touchLogin(userId: string): void {
    const user = this.requireUser(userId);
    user.activityCount += 1;
  }

  verifyEmailToken(token: string): AuthenticatedViewer | null {
    const user = users.find((entry) => entry.verificationToken === token);
    if (!user) {
      return null;
    }

    user.isEmailVerified = true;
    user.verificationToken = null;
    return this.toSummary(user);
  }

  toSummary(user: UserRecord): AuthenticatedViewer {
    const { passwordHash, refreshTokenHash, verificationToken, activityCount, ...summary } = user;
    void passwordHash;
    void refreshTokenHash;
    void verificationToken;
    void activityCount;
    return summary;
  }

  private requireUser(userId: string): UserRecord {
    const user = this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }
}
