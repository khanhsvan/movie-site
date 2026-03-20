import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DmcaRequestStatus, LicenseRecord, LicenseStatus, TosVersionRecord } from '@netflix-mini/types';
import { CreateLicenseDto } from './dto/create-license.dto';

const licenses: LicenseRecord[] = [
  {
    id: 'LIC-2026-0001',
    contentTitle: 'Galaxy Heist',
    ownerName: 'Orbit Rights LLC',
    issuerOrganization: 'Global Film Registry',
    validityStart: '2026-01-01T00:00:00.000Z',
    validityEnd: '2027-01-01T00:00:00.000Z',
    territory: ['VN', 'US', 'SG'],
    status: LicenseStatus.VALID,
    signature: 'demo-signature',
    attachedVideoId: 'vid_movie_1',
    licenseDocumentName: 'galaxy-heist-license.pdf'
  }
];

const tosVersions: TosVersionRecord[] = [
  {
    id: 'tos_2026_03',
    version: '2026.03',
    title: 'StreamVault Terms of Service',
    content:
      'By creating an account, you agree to lawful use, subscription rules, content restrictions, privacy handling, and copyright enforcement procedures.',
    publishedAt: '2026-03-18T00:00:00.000Z',
    isActive: true
  }
];

const dmcaRequests: Array<{
  id: string;
  reporterName: string;
  reporterEmail: string;
  contentUrl: string;
  reason: string;
  status: DmcaRequestStatus;
  createdAt: string;
  affectedVideoId?: string | null;
}> = [
  {
    id: 'dmca_1',
    reporterName: 'Jane Rights',
    reporterEmail: 'jane@example.com',
    contentUrl: 'https://streamvault.local/videos/galaxy-heist',
    reason: 'Unauthorized regional distribution claim.',
    status: DmcaRequestStatus.UNDER_REVIEW,
    createdAt: new Date().toISOString(),
    affectedVideoId: 'vid_movie_1'
  }
];

const blockedVideoIds = new Set<string>(['vid_movie_1']);

@Injectable()
export class ComplianceService {
  listLicenses() {
    return licenses;
  }

  createLicense(dto: CreateLicenseDto) {
    const id = `LIC-2026-${String(licenses.length + 1).padStart(4, '0')}`;
    const signature = createHash('sha256')
      .update(
        JSON.stringify({
          id,
          contentTitle: dto.contentTitle,
          ownerName: dto.ownerName,
          issuerOrganization: dto.issuerOrganization,
          validityStart: dto.validityStart,
          validityEnd: dto.validityEnd,
          territory: dto.territory
        })
      )
      .digest('hex');

    const record: LicenseRecord = {
      id,
      status: LicenseStatus.PENDING,
      signature,
      ...dto
    };

    licenses.unshift(record);
    return record;
  }

  verifyLicense(licenseId: string) {
    const record = licenses.find((license) => license.id === licenseId);
    if (!record) {
      throw new NotFoundException('License not found.');
    }

    return {
      authentic: true,
      record
    };
  }

  currentTos() {
    return tosVersions.find((version) => version.isActive) ?? tosVersions[0];
  }

  listTosVersions() {
    return tosVersions;
  }

  listDmcaRequests() {
    return dmcaRequests;
  }

  createDmcaRequest(payload: {
    reporterName: string;
    reporterEmail: string;
    contentUrl: string;
    reason: string;
  }) {
    const affectedVideoId = this.resolveVideoIdFromUrl(payload.contentUrl);
    const request = {
      id: `dmca_${dmcaRequests.length + 1}`,
      status: DmcaRequestStatus.PENDING,
      createdAt: new Date().toISOString(),
      affectedVideoId,
      ...payload
    };

    dmcaRequests.unshift(request);
    if (affectedVideoId) {
      blockedVideoIds.add(affectedVideoId);
    }
    return {
      ...request,
      affectedContentDisabled: Boolean(affectedVideoId)
    };
  }

  updateDmcaStatus(id: string, status: DmcaRequestStatus) {
    const request = dmcaRequests.find((item) => item.id === id);
    if (!request) {
      throw new NotFoundException('DMCA request not found.');
    }

    request.status = status;
    if (request.affectedVideoId) {
      if (status === DmcaRequestStatus.REJECTED) {
        blockedVideoIds.delete(request.affectedVideoId);
      } else {
        blockedVideoIds.add(request.affectedVideoId);
      }
    }
    return request;
  }

  isContentUnderReview(videoId: string) {
    return blockedVideoIds.has(videoId);
  }

  complianceOverview() {
    return {
      validLicenses: licenses.filter((license) => license.status === LicenseStatus.VALID).length,
      expiredLicenses: licenses.filter((license) => license.status === LicenseStatus.EXPIRED).length,
      pendingDmcaRequests: dmcaRequests.filter((request) => request.status === DmcaRequestStatus.PENDING).length,
      underReviewContent: blockedVideoIds.size
    };
  }

  private resolveVideoIdFromUrl(url: string) {
    if (url.includes('galaxy-heist') || url.includes('vid_movie_1')) {
      return 'vid_movie_1';
    }

    if (url.includes('midnight-files') || url.includes('vid_series_1')) {
      return 'vid_series_1';
    }

    return null;
  }
}
