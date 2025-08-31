import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { StartupModule } from '../startup/startup.module';

@Module({
  imports: [ScheduleModule.forRoot(), StartupModule],
  providers: [MonitoringService],
  controllers: [MonitoringController],
  exports: [MonitoringService],
})
export class MonitoringModule {}
