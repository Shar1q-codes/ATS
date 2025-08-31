import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { getJwtSecret } from './common/config/env-validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { JobsModule } from './jobs/jobs.module';
import { CandidatesModule } from './candidates/candidates.module';
import { ApplicationsModule } from './applications/applications.module';
import { ResumeParsingModule } from './resume-parsing/resume-parsing.module';
import { MatchingModule } from './matching/matching.module';
import { CommunicationModule } from './communication/communication.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SearchModule } from './search/search.module';
import { DataMigrationModule } from './data-migration/data-migration.module';
import { HealthModule } from './common/health/health.module';
import { StartupModule } from './common/startup/startup.module';
import { MonitoringModule } from './common/monitoring/monitoring.module';
import { PerformanceModule } from './common/performance/performance.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { CompressionInterceptor } from './common/performance/compression.interceptor';
import { SentryService } from './common/sentry/sentry.service';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '24h' },
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379') || 6379,
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: parseInt(
          process.env.QUEUE_REMOVE_ON_COMPLETE || '10',
        ),
        removeOnFail: parseInt(process.env.QUEUE_REMOVE_ON_FAIL || '50'),
        attempts: parseInt(process.env.QUEUE_MAX_ATTEMPTS || '3'),
        backoff: {
          type: 'exponential',
          delay: parseInt(process.env.QUEUE_BACKOFF_DELAY || '2000'),
        },
      },
    }),
    DatabaseModule,
    PerformanceModule,
    AuthModule,
    JobsModule,
    CandidatesModule,
    ApplicationsModule,
    ResumeParsingModule,
    MatchingModule,
    CommunicationModule,
    AnalyticsModule,
    OrganizationsModule,
    RealtimeModule,
    SearchModule,
    DataMigrationModule,
    HealthModule,
    StartupModule,
    MonitoringModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SentryService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CompressionInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
