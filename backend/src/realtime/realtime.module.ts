import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './gateways/realtime.gateway';
import { RealtimeService } from './services/realtime.service';
import { PresenceService } from './services/presence.service';
import { NotificationService } from './services/notification.service';
import { NotificationController } from './controllers/notification.controller';
import { Application } from '../entities/application.entity';
import { ApplicationNote } from '../entities/application-note.entity';
import { User } from '../entities/user.entity';
import { Notification } from '../entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      ApplicationNote,
      User,
      Notification,
    ]),
    JwtModule.register({}), // Will use global JWT config
  ],
  controllers: [NotificationController],
  providers: [
    RealtimeGateway,
    RealtimeService,
    PresenceService,
    NotificationService,
  ],
  exports: [RealtimeService, PresenceService, NotificationService],
})
export class RealtimeModule {}
