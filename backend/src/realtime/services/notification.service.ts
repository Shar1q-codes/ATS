import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { Application } from '../../entities/application.entity';
import { ApplicationNote } from '../../entities/application-note.entity';

export interface CreateNotificationDto {
  recipientId: string;
  senderId?: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  applicationId?: string;
  applicationNoteId?: string;
  actionUrl?: string;
  expiresAt?: Date;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  mentionNotifications: boolean;
  stageChangeNotifications: boolean;
  digestFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(ApplicationNote)
    private readonly applicationNoteRepository: Repository<ApplicationNote>,
  ) {}

  async createNotification(
    tenantId: string,
    notificationData: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...notificationData,
      tenantId,
      priority: notificationData.priority || NotificationPriority.MEDIUM,
    });

    return await this.notificationRepository.save(notification);
  }

  async createApplicationStageChangeNotification(
    applicationId: string,
    fromStage: string,
    toStage: string,
    changedById: string,
    tenantId: string,
  ): Promise<void> {
    try {
      // Get application details
      const application = await this.applicationRepository.findOne({
        where: { id: applicationId, tenantId },
        relations: ['candidate', 'companyJobVariant'],
      });

      if (!application) {
        this.logger.warn(
          `Application ${applicationId} not found for notification`,
        );
        return;
      }

      // Get the user who made the change
      const changedBy = await this.userRepository.findOne({
        where: { id: changedById, tenantId },
        select: ['id', 'firstName', 'lastName'],
      });

      if (!changedBy) {
        this.logger.warn(`User ${changedById} not found for notification`);
        return;
      }

      // Get all users in the tenant who should be notified (excluding the person who made the change)
      const usersToNotify = await this.userRepository.find({
        where: {
          tenantId,
          id: In(['']), // This would be replaced with actual logic to determine who should be notified
        },
        select: ['id', 'firstName', 'lastName', 'email'],
      });

      // Create notifications for each user
      const notifications = usersToNotify
        .filter((user) => user.id !== changedById)
        .map((user) => ({
          recipientId: user.id,
          senderId: changedById,
          type: NotificationType.APPLICATION_STAGE_CHANGE,
          priority: NotificationPriority.MEDIUM,
          title: 'Application Stage Updated',
          message: `${changedBy.firstName} ${changedBy.lastName} moved ${application.candidate?.firstName || 'candidate'} from ${fromStage} to ${toStage}`,
          data: {
            applicationId,
            candidateName: `${application.candidate?.firstName} ${application.candidate?.lastName}`,
            fromStage,
            toStage,
            changedBy: `${changedBy.firstName} ${changedBy.lastName}`,
          },
          applicationId,
          actionUrl: `/applications/${applicationId}`,
        }));

      if (notifications.length > 0) {
        const createdNotifications = notifications.map((notif) =>
          this.notificationRepository.create({ ...notif, tenantId }),
        );

        await this.notificationRepository.save(createdNotifications);
        this.logger.log(
          `Created ${notifications.length} stage change notifications for application ${applicationId}`,
        );
      }
    } catch (error) {
      this.logger.error('Error creating stage change notification:', error);
    }
  }

  async createMentionNotifications(
    applicationId: string,
    noteId: string,
    mentionedUserIds: string[],
    mentionedById: string,
    tenantId: string,
  ): Promise<void> {
    try {
      // Get application and note details
      const [application, note, mentionedBy] = await Promise.all([
        this.applicationRepository.findOne({
          where: { id: applicationId, tenantId },
          relations: ['candidate'],
        }),
        this.applicationNoteRepository.findOne({
          where: { id: noteId, tenantId },
        }),
        this.userRepository.findOne({
          where: { id: mentionedById, tenantId },
          select: ['id', 'firstName', 'lastName'],
        }),
      ]);

      if (!application || !note || !mentionedBy) {
        this.logger.warn('Missing data for mention notification');
        return;
      }

      // Get mentioned users
      const mentionedUsers = await this.userRepository.find({
        where: {
          id: In(mentionedUserIds),
          tenantId,
        },
        select: ['id', 'firstName', 'lastName', 'email'],
      });

      // Create notifications for each mentioned user (excluding the person who made the mention)
      const notifications = mentionedUsers
        .filter((user) => user.id !== mentionedById)
        .map((user) => ({
          recipientId: user.id,
          senderId: mentionedById,
          type: NotificationType.MENTION,
          priority: NotificationPriority.HIGH,
          title: 'You were mentioned',
          message: `${mentionedBy.firstName} ${mentionedBy.lastName} mentioned you in a note on ${application.candidate?.firstName || 'candidate'}'s application`,
          data: {
            applicationId,
            noteId,
            candidateName: `${application.candidate?.firstName} ${application.candidate?.lastName}`,
            mentionedBy: `${mentionedBy.firstName} ${mentionedBy.lastName}`,
            notePreview:
              note.content.substring(0, 100) +
              (note.content.length > 100 ? '...' : ''),
          },
          applicationId,
          applicationNoteId: noteId,
          actionUrl: `/applications/${applicationId}#note-${noteId}`,
        }));

      if (notifications.length > 0) {
        const createdNotifications = notifications.map((notif) =>
          this.notificationRepository.create({ ...notif, tenantId }),
        );

        await this.notificationRepository.save(createdNotifications);
        this.logger.log(
          `Created ${notifications.length} mention notifications for note ${noteId}`,
        );
      }
    } catch (error) {
      this.logger.error('Error creating mention notifications:', error);
    }
  }

  async getUserNotifications(
    userId: string,
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
    } = {},
  ): Promise<{ notifications: Notification[]; total: number }> {
    const { limit = 50, offset = 0, unreadOnly = false, type } = options;

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.sender', 'sender')
      .leftJoinAndSelect('notification.application', 'application')
      .leftJoinAndSelect('application.candidate', 'candidate')
      .where('notification.recipientId = :userId', { userId })
      .andWhere('notification.tenantId = :tenantId', { tenantId });

    if (unreadOnly) {
      queryBuilder.andWhere('notification.isRead = false');
    }

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    // Filter out expired notifications
    queryBuilder.andWhere(
      '(notification.expiresAt IS NULL OR notification.expiresAt > :now)',
      { now: new Date() },
    );

    const [notifications, total] = await queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return { notifications, total };
  }

  async markNotificationAsRead(
    notificationId: string,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    await this.notificationRepository.update(
      {
        id: notificationId,
        recipientId: userId,
        tenantId,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );
  }

  async markAllNotificationsAsRead(
    userId: string,
    tenantId: string,
  ): Promise<void> {
    await this.notificationRepository.update(
      {
        recipientId: userId,
        tenantId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );
  }

  async getUnreadNotificationCount(
    userId: string,
    tenantId: string,
  ): Promise<number> {
    return await this.notificationRepository.count({
      where: {
        recipientId: userId,
        tenantId,
        isRead: false,
      },
    });
  }

  async deleteNotification(
    notificationId: string,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    await this.notificationRepository.delete({
      id: notificationId,
      recipientId: userId,
      tenantId,
    });
  }

  async cleanupExpiredNotifications(): Promise<void> {
    const result = await this.notificationRepository.delete({
      expiresAt: In([new Date()]), // This would use LessThan in a real implementation
    });

    this.logger.log(`Cleaned up ${result.affected} expired notifications`);
  }

  // Get notification preferences for a user (this would typically be stored in a separate table)
  async getUserNotificationPreferences(
    userId: string,
    tenantId: string,
  ): Promise<NotificationPreferences> {
    // For now, return default preferences
    // In a real implementation, this would fetch from a user_notification_preferences table
    return {
      emailNotifications: true,
      inAppNotifications: true,
      mentionNotifications: true,
      stageChangeNotifications: true,
      digestFrequency: 'immediate',
    };
  }

  async updateUserNotificationPreferences(
    userId: string,
    tenantId: string,
    preferences: Partial<NotificationPreferences>,
  ): Promise<void> {
    // In a real implementation, this would update the user_notification_preferences table
    this.logger.log(
      `Updated notification preferences for user ${userId}:`,
      preferences,
    );
  }
}
