import { Module } from '@nestjs/common';
import { AccessAuditModule } from '../audit/access-audit.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { VideosModule } from '../videos/videos.module';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Module({
  imports: [VideosModule, ComplianceModule, AccessAuditModule],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService]
})
export class StorageModule {}
