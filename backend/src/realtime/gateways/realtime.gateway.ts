import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RealtimeService } from '../services/realtime.service';
import { PresenceService } from '../services/presence.service';
import { NotificationService } from '../services/notification.service';
import { getCorsOrigin } from '../../common/config/env-validation';

@WebSocketGateway({
  cors: {
    origin: getCorsOrigin(),
    credentials: true,
  },
  namespace: '/realtime',
})
@UseGuards(JwtAuthGuard)
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly presenceService: PresenceService,
    private readonly notificationService: NotificationService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const user = await this.realtimeService.authenticateSocket(client);
      if (!user) {
        client.disconnect();
        return;
      }

      client.data.user = user;
      client.data.tenantId = user.tenantId;

      // Join tenant-specific room
      await client.join(`tenant:${user.tenantId}`);

      // Update presence
      await this.presenceService.setUserOnline(user.id, client.id);

      // Notify others in the tenant about user coming online
      client.to(`tenant:${user.tenantId}`).emit('user:online', {
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
      });

      this.logger.log(`User ${user.id} connected to tenant ${user.tenantId}`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data.user) {
      const user = client.data.user;

      // Update presence
      await this.presenceService.setUserOffline(user.id, client.id);

      // Check if user is still online from other connections
      const isStillOnline = await this.presenceService.isUserOnline(user.id);

      if (!isStillOnline) {
        // Notify others in the tenant about user going offline
        client.to(`tenant:${user.tenantId}`).emit('user:offline', {
          userId: user.id,
        });
      }

      this.logger.log(
        `User ${user.id} disconnected from tenant ${user.tenantId}`,
      );
    }
  }

  @SubscribeMessage('application:join')
  async handleJoinApplication(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { applicationId: string },
  ) {
    const user = client.data.user;
    const { applicationId } = data;

    // Verify user has access to this application
    const hasAccess = await this.realtimeService.verifyApplicationAccess(
      user.id,
      applicationId,
      user.tenantId,
    );

    if (!hasAccess) {
      client.emit('error', { message: 'Access denied to application' });
      return;
    }

    // Join application-specific room
    await client.join(`application:${applicationId}`);

    // Update presence for this application
    await this.presenceService.setUserViewingApplication(
      user.id,
      applicationId,
    );

    // Notify others viewing this application
    client.to(`application:${applicationId}`).emit('application:user_joined', {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      applicationId,
    });

    // Send current viewers to the joining user
    const currentViewers =
      await this.presenceService.getApplicationViewers(applicationId);
    client.emit('application:current_viewers', {
      applicationId,
      viewers: currentViewers,
    });
  }

  @SubscribeMessage('application:leave')
  async handleLeaveApplication(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { applicationId: string },
  ) {
    const user = client.data.user;
    const { applicationId } = data;

    // Leave application-specific room
    await client.leave(`application:${applicationId}`);

    // Update presence
    await this.presenceService.removeUserFromApplication(
      user.id,
      applicationId,
    );

    // Notify others viewing this application
    client.to(`application:${applicationId}`).emit('application:user_left', {
      userId: user.id,
      applicationId,
    });
  }

  @SubscribeMessage('application:stage_change')
  async handleStageChange(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      applicationId: string;
      fromStage: string;
      toStage: string;
      notes?: string;
    },
  ) {
    const user = client.data.user;
    const { applicationId, fromStage, toStage, notes } = data;

    try {
      // Verify access and update application stage
      await this.realtimeService.updateApplicationStage(
        applicationId,
        fromStage,
        toStage,
        user.id,
        user.tenantId,
        notes,
      );

      // Broadcast stage change to all users in the tenant
      this.server
        .to(`tenant:${user.tenantId}`)
        .emit('application:stage_updated', {
          applicationId,
          fromStage,
          toStage,
          updatedBy: {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
          },
          updatedAt: new Date(),
          notes,
        });

      // Send notification to relevant users
      await this.notificationService.createApplicationStageChangeNotification(
        applicationId,
        fromStage,
        toStage,
        user.id,
        user.tenantId,
      );
    } catch (error) {
      client.emit('error', { message: 'Failed to update application stage' });
      this.logger.error('Stage change error:', error);
    }
  }

  @SubscribeMessage('application:note_add')
  async handleAddNote(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      applicationId: string;
      content: string;
      mentions?: string[];
    },
  ) {
    const user = client.data.user;
    const { applicationId, content, mentions } = data;

    try {
      const note = await this.realtimeService.addApplicationNote(
        applicationId,
        content,
        user.id,
        user.tenantId,
        mentions,
      );

      // Broadcast new note to application viewers
      this.server
        .to(`application:${applicationId}`)
        .emit('application:note_added', {
          note: {
            id: note.id,
            content: note.content,
            createdAt: note.createdAt,
            author: {
              id: user.id,
              name: `${user.firstName} ${user.lastName}`,
            },
          },
          applicationId,
        });

      // Send notifications for mentions
      if (mentions && mentions.length > 0) {
        await this.notificationService.createMentionNotifications(
          applicationId,
          note.id,
          mentions,
          user.id,
          user.tenantId,
        );
      }
    } catch (error) {
      client.emit('error', { message: 'Failed to add note' });
      this.logger.error('Add note error:', error);
    }
  }

  @SubscribeMessage('application:note_edit')
  async handleEditNote(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      noteId: string;
      content: string;
      mentions?: string[];
    },
  ) {
    const user = client.data.user;
    const { noteId, content, mentions } = data;

    try {
      const note = await this.realtimeService.editApplicationNote(
        noteId,
        content,
        user.id,
        user.tenantId,
        mentions,
      );

      // Broadcast note edit to application viewers
      this.server
        .to(`application:${note.applicationId}`)
        .emit('application:note_edited', {
          note: {
            id: note.id,
            content: note.content,
            updatedAt: note.updatedAt,
            author: {
              id: user.id,
              name: `${user.firstName} ${user.lastName}`,
            },
          },
          applicationId: note.applicationId,
        });

      // Send notifications for new mentions
      if (mentions && mentions.length > 0) {
        await this.notificationService.createMentionNotifications(
          note.applicationId,
          note.id,
          mentions,
          user.id,
          user.tenantId,
        );
      }
    } catch (error) {
      client.emit('error', { message: 'Failed to edit note' });
      this.logger.error('Edit note error:', error);
    }
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { applicationId: string },
  ) {
    const user = client.data.user;
    const { applicationId } = data;

    client.to(`application:${applicationId}`).emit('typing:user_started', {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      applicationId,
    });
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { applicationId: string },
  ) {
    const user = client.data.user;
    const { applicationId } = data;

    client.to(`application:${applicationId}`).emit('typing:user_stopped', {
      userId: user.id,
      applicationId,
    });
  }

  // Method to broadcast notifications to specific users
  async broadcastNotification(userId: string, notification: any) {
    const userSockets = await this.presenceService.getUserSockets(userId);
    userSockets.forEach((socketId) => {
      this.server.to(socketId).emit('notification:new', notification);
    });
  }

  // Method to broadcast to entire tenant
  async broadcastToTenant(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }
}
