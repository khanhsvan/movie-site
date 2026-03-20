import { Module } from '@nestjs/common';
import { AccessAuditService } from './access-audit.service';

@Module({
  providers: [AccessAuditService],
  exports: [AccessAuditService]
})
export class AccessAuditModule {}

