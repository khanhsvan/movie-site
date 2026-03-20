import { Module } from '@nestjs/common';
import { AccessAuditModule } from '../audit/access-audit.module';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';

@Module({
  imports: [AccessAuditModule],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService]
})
export class ComplianceModule {}

