import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StartupService } from './startup.service';
import { StartupController } from './startup.controller';

@Module({
  imports: [ConfigModule, TypeOrmModule],
  providers: [StartupService],
  controllers: [StartupController],
  exports: [StartupService],
})
export class StartupModule {}
