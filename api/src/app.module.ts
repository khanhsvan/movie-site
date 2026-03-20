import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AccessLogMiddleware } from './common/middleware/access-log.middleware';
import { AccessAuditModule } from './modules/audit/access-audit.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { VideosModule } from './modules/videos/videos.module';
import { WatchHistoryModule } from './modules/watch-history/watch-history.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { StorageModule } from './modules/storage/storage.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { StreamingModule } from './modules/streaming/streaming.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    HealthModule,
    AccessAuditModule,
    ComplianceModule,
    AuthModule,
    UsersModule,
    VideosModule,
    StorageModule,
    WatchHistoryModule,
    SubscriptionsModule,
    PaymentsModule,
    AdminModule,
    AnalyticsModule,
    StreamingModule
  ],
  providers: [AccessLogMiddleware]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AccessLogMiddleware).forRoutes('videos');
  }
}
