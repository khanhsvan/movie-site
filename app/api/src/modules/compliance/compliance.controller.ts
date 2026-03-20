import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { DmcaRequestStatus, UserRole } from '@netflix-mini/types';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedGuard } from '../../common/guards/authenticated.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessAuditService } from '../audit/access-audit.service';
import { CreateDmcaRequestDto } from '../legal/dto/create-dmca-request.dto';
import { CreateLicenseDto } from './dto/create-license.dto';
import { ComplianceService } from './compliance.service';

@Controller()
export class ComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly accessAuditService: AccessAuditService
  ) {}

  @Get('licenses/verify/:licenseId')
  verify(@Param('licenseId') licenseId: string) {
    return this.complianceService.verifyLicense(licenseId);
  }

  @Get('legal/terms')
  currentTos() {
    return this.complianceService.currentTos();
  }

  @Get('legal/terms/versions')
  listTosVersions() {
    return this.complianceService.listTosVersions();
  }

  @Get('legal/copyright-policy')
  copyrightPolicy() {
    return {
      title: 'Copyright Policy',
      body:
        'We respond to copyright complaints, review evidence, temporarily disable disputed content during review, and preserve audit logs for lawful compliance.'
    };
  }

  @Post('dmca-requests')
  submitDmca(@Body() body: CreateDmcaRequestDto) {
    return this.complianceService.createDmcaRequest(body);
  }

  @Get('admin/licenses')
  @UseGuards(JwtAuthGuard, AuthenticatedGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.OWNER)
  listLicenses() {
    return this.complianceService.listLicenses();
  }

  @Post('admin/licenses')
  @UseGuards(JwtAuthGuard, AuthenticatedGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.OWNER)
  createLicense(@Body() dto: CreateLicenseDto) {
    return this.complianceService.createLicense(dto);
  }

  @Get('admin/compliance/overview')
  @UseGuards(JwtAuthGuard, AuthenticatedGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.OWNER)
  overview() {
    return this.complianceService.complianceOverview();
  }

  @Get('admin/dmca-requests')
  @UseGuards(JwtAuthGuard, AuthenticatedGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.OWNER)
  listDmcaRequests() {
    return this.complianceService.listDmcaRequests();
  }

  @Patch('admin/dmca-requests/:id/:status')
  @UseGuards(JwtAuthGuard, AuthenticatedGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.OWNER)
  updateDmcaStatus(@Param('id') id: string, @Param('status') status: DmcaRequestStatus) {
    return this.complianceService.updateDmcaStatus(id, status);
  }

  @Get('admin/access-logs')
  @UseGuards(JwtAuthGuard, AuthenticatedGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR, UserRole.OWNER)
  listAccessLogs() {
    return this.accessAuditService.list();
  }
}
