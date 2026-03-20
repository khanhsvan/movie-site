import { Injectable } from '@nestjs/common';
import { canAccessVideo, PREVIEW_DURATION_SECONDS } from '@netflix-mini/config';
import {
  PlaybackAuthorizationResponse,
  RestrictionReason,
  SubscriptionStatus,
  UserRole,
  VideoAccessTier
} from '@netflix-mini/types';
import { ComplianceService } from '../compliance/compliance.service';
import { StorageService } from '../storage/storage.service';
import { VideosService } from '../videos/videos.service';

@Injectable()
export class StreamingService {
  constructor(
    private readonly videosService: VideosService,
    private readonly storageService: StorageService,
    private readonly complianceService: ComplianceService
  ) {}

  async authorizePlayback(videoId: string, viewer?: {
    id?: string;
    role?: UserRole;
    subscriptionStatus?: SubscriptionStatus | null;
    region?: string;
    verifiedForRestrictedContent?: boolean;
    isBanned?: boolean;
  }, apiBaseUrl?: string) {
    const video = await this.videosService.getById(videoId);

    if (viewer?.isBanned) {
      return <PlaybackAuthorizationResponse>{
        allowed: false,
        lockReason: 'LOGIN_REQUIRED',
        message: 'Your account has been restricted from accessing content.'
      };
    }

    if (this.complianceService.isContentUnderReview(videoId)) {
      return <PlaybackAuthorizationResponse>{
        allowed: false,
        lockReason: 'PROCESSING',
        message: 'This title is temporarily unavailable while a copyright claim is under review.'
      };
    }

    const canBypassRestrictions = viewer?.role === UserRole.ADMIN || viewer?.role === UserRole.MODERATOR;
    if (!canBypassRestrictions) {
      if (video.visibility === 'PRIVATE') {
        return <PlaybackAuthorizationResponse>{
          allowed: false,
          lockReason: 'LOGIN_REQUIRED',
          message: 'This video is private.'
        };
      }

      if (video.visibility === 'RESTRICTED') {
        if (video.allowedRegions?.length && (!viewer?.region || !video.allowedRegions.includes(viewer.region))) {
          return <PlaybackAuthorizationResponse>{
            allowed: false,
            lockReason: 'LOGIN_REQUIRED',
            message: 'This video is not available in your region.'
          };
        }

        if (video.requiresVerification && !viewer?.verifiedForRestrictedContent) {
          return <PlaybackAuthorizationResponse>{
            allowed: false,
            lockReason: 'LOGIN_REQUIRED',
            message:
              video.restrictionReason === RestrictionReason.DMCA
                ? 'DMCA-flagged content requires verification before viewing.'
                : 'This restricted content requires additional verification before viewing.'
          };
        }
      }
    }

    const access = canAccessVideo({
      role: viewer?.role,
      subscriptionStatus: viewer?.subscriptionStatus,
      accessTier: video.accessTier as VideoAccessTier
    });

    if (access.allowed) {
      const asset = await this.storageService.buildPlayableUrl(video.id, 'master', apiBaseUrl);
      return <PlaybackAuthorizationResponse>{
        allowed: true,
        manifestUrl: asset.url,
        resumeSeconds: 642,
        previewEndsAtSeconds: PREVIEW_DURATION_SECONDS,
        accessToken: asset.token,
        expiresAt: asset.expiresAt,
        watermarkText: `${viewer?.id ?? 'guest'} | ${new Date().toISOString()}`
      };
    }

    if (!viewer?.role || viewer.role === UserRole.GUEST) {
      const asset = await this.storageService.buildPlayableUrl(video.id, 'preview', apiBaseUrl);
      return <PlaybackAuthorizationResponse>{
        allowed: true,
        manifestUrl: asset.url,
        previewEndsAtSeconds: video.previewDurationSeconds,
        message: 'Preview access only. Sign in or subscribe to continue.',
        accessToken: asset.token,
        expiresAt: asset.expiresAt,
        watermarkText: `guest | ${new Date().toISOString()}`
      };
    }

    return <PlaybackAuthorizationResponse>{
      allowed: false,
      lockReason: 'SUBSCRIPTION_REQUIRED',
      previewEndsAtSeconds: video.previewDurationSeconds,
      message: 'Subscription required for premium playback.'
    };
  }
}
