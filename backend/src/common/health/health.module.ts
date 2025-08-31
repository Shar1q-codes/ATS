import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { StartupModule } from '../startup/startup.module';

@Module({
  imports: [TerminusModule, StartupModule],
  controllers: [HealthController],
})
export class HealthModule {}
