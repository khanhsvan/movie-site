import { Module } from '@nestjs/common';
import { ComplianceModule } from '../compliance/compliance.module';
import { StorageModule } from '../storage/storage.module';
import { VideosModule } from '../videos/videos.module';
import { StreamingController } from './streaming.controller';
import { StreamingService } from './streaming.service';

@Module({
  imports: [VideosModule, StorageModule, ComplianceModule],
  controllers: [StreamingController],
  providers: [StreamingService]
})
export class StreamingModule {}
