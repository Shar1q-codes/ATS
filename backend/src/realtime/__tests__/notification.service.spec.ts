import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from '../services/notification.service';
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { Application } from '../../entities/application.entity';
import { ApplicationNote } from '../../entities/application-note.entity';

describe('NotificationService', () => {
  let service: NotificationService;
  let notificationRepository: Repository<Notification>;
  let userRepository: Repository<User>;
  let applicationRepository: Repository<Application>;
  let applicationNoteRepository: Repository<ApplicationNote>;

  const mockTenantId = 'tenant-1';
  const mockUser = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    tenantId: mockTenantId,
  };

  const mockApplication = {
    id: 'app-1',
    tenantId: mockTenantId,
    candidate: {
      id: 'candidate-1',
      firstName: 'Jane',
      lastName: 'Smith',
    },
  };

  const mockNote = {
    id: 'note-1',
    content: 'This is a test note',
    applicationId: 'app-1',
    tenantId: mockTenantId,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Application),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ApplicationNote),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    notificationRepository = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    applicationRepository = module.get<Repository<Application>>(
      getRepositoryToken(Application),
    );
    applicationNoteRepository = module.get<Repository<ApplicationNote>>(
      getRepositoryToken(ApplicationNote),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create and save a notification', async () => {
      const notificationData = {
        recipientId: 'user-1',
        senderId: 'user-2',
        type: NotificationType.MENTION,
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: NotificationPriority.HIGH,
      };

      const mockNotification = {
        id: 'notification-1',
        ...notificationData,
        tenantId: mockTenantId,
      };

      jest
        .spyOn(notificationRepository, 'create')
        .mockReturnValue(mockNotification as any);
      jest
        .spyOn(notificationRepository, 'save')
        .mockResolvedValue(mockNotification as any);

      const result = await service.createNotification(
        mockTenantId,
        notificationData,
      );

      expect(notificationRepository.create).toHaveBeenCalledWith({
        ...notificationData,
        tenantId: mockTenantId,
      });
      expect(notificationRepository.save).toHaveBeenCalledWith(
        mockNotification,
      );
      expect(result).toEqual(mockNotification);
    });

    it('should use default priority if not provided', async () => {
      const notificationData = {
        recipientId: 'user-1',
        type: NotificationType.SYSTEM,
        title: 'Test Notification',
        message: 'This is a test notification',
      };

      const mockNotification = {
        id: 'notification-1',
        ...notificationData,
        tenantId: mockTenantId,
        priority: NotificationPriority.MEDIUM,
      };

      jest
        .spyOn(notificationRepository, 'create')
        .mockReturnValue(mockNotification as any);
      jest
        .spyOn(notificationRepository, 'save')
        .mockResolvedValue(mockNotification as any);

      await service.createNotification(mockTenantId, notificationData);

      expect(notificationRepository.create).toHaveBeenCalledWith({
        ...notificationData,
        tenantId: mockTenantId,
        priority: NotificationPriority.MEDIUM,
      });
    });
  });

  describe('createApplicationStageChangeNotification', () => {
    it('should create stage change notifications for relevant users', async () => {
      const changedBy = { id: 'user-2', firstName: 'Jane', lastName: 'Doe' };
      const usersToNotify = [mockUser];

      jest
        .spyOn(applicationRepository, 'findOne')
        .mockResolvedValue(mockApplication as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(changedBy as any);
      jest
        .spyOn(userRepository, 'find')
        .mockResolvedValue(usersToNotify as any);
      jest
        .spyOn(notificationRepository, 'create')
        .mockImplementation((data) => data as any);
      jest.spyOn(notificationRepository, 'save').mockResolvedValue([] as any);

      await service.createApplicationStageChangeNotification(
        'app-1',
        'applied',
        'screening',
        'user-2',
        mockTenantId,
      );

      expect(applicationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'app-1', tenantId: mockTenantId },
        relations: ['candidate', 'companyJobVariant'],
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-2', tenantId: mockTenantId },
        select: ['id', 'firstName', 'lastName'],
      });

      expect(notificationRepository.save).toHaveBeenCalled();
    });

    it('should handle missing application gracefully', async () => {
      jest.spyOn(applicationRepository, 'findOne').mockResolvedValue(null);

      await service.createApplicationStageChangeNotification(
        'app-1',
        'applied',
        'screening',
        'user-2',
        mockTenantId,
      );

      expect(notificationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('createMentionNotifications', () => {
    it('should create mention notifications for mentioned users', async () => {
      const mentionedBy = { id: 'user-2', firstName: 'Jane', lastName: 'Doe' };
      const mentionedUsers = [mockUser];

      jest
        .spyOn(applicationRepository, 'findOne')
        .mockResolvedValue(mockApplication as any);
      jest
        .spyOn(applicationNoteRepository, 'findOne')
        .mockResolvedValue(mockNote as any);
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mentionedBy as any);
      jest
        .spyOn(userRepository, 'find')
        .mockResolvedValue(mentionedUsers as any);
      jest
        .spyOn(notificationRepository, 'create')
        .mockImplementation((data) => data as any);
      jest.spyOn(notificationRepository, 'save').mockResolvedValue([] as any);

      await service.createMentionNotifications(
        'app-1',
        'note-1',
        ['user-1'],
        'user-2',
        mockTenantId,
      );

      expect(applicationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'app-1', tenantId: mockTenantId },
        relations: ['candidate'],
      });

      expect(applicationNoteRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'note-1', tenantId: mockTenantId },
      });

      expect(userRepository.find).toHaveBeenCalledWith({
        where: { id: expect.anything(), tenantId: mockTenantId },
        select: ['id', 'firstName', 'lastName', 'email'],
      });

      expect(notificationRepository.save).toHaveBeenCalled();
    });

    it('should not create notification for the user who made the mention', async () => {
      const mentionedBy = mockUser; // Same user who made the mention
      const mentionedUsers = [mockUser];

      jest
        .spyOn(applicationRepository, 'findOne')
        .mockResolvedValue(mockApplication as any);
      jest
        .spyOn(applicationNoteRepository, 'findOne')
        .mockResolvedValue(mockNote as any);
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mentionedBy as any);
      jest
        .spyOn(userRepository, 'find')
        .mockResolvedValue(mentionedUsers as any);
      jest.spyOn(notificationRepository, 'save').mockResolvedValue([] as any);

      await service.createMentionNotifications(
        'app-1',
        'note-1',
        ['user-1'], // Mentioning themselves
        'user-1', // Same user
        mockTenantId,
      );

      // Should not save any notifications since the user mentioned themselves
      expect(notificationRepository.save).toHaveBeenCalledWith([]);
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications with pagination', async () => {
      const mockNotifications = [
        { id: 'notification-1', title: 'Test 1' },
        { id: 'notification-2', title: 'Test 2' },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockNotifications, 2]),
      };

      jest
        .spyOn(notificationRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUserNotifications(
        'user-1',
        mockTenantId,
        {
          limit: 10,
          offset: 0,
          unreadOnly: true,
        },
      );

      expect(result).toEqual({
        notifications: mockNotifications,
        total: 2,
      });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'notification.recipientId = :userId',
        { userId: 'user-1' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.tenantId = :tenantId',
        { tenantId: mockTenantId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.isRead = false',
      );
    });

    it('should filter by notification type when provided', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest
        .spyOn(notificationRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await service.getUserNotifications('user-1', mockTenantId, {
        type: NotificationType.MENTION,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.type = :type',
        { type: NotificationType.MENTION },
      );
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      jest.spyOn(notificationRepository, 'update').mockResolvedValue({} as any);

      await service.markNotificationAsRead(
        'notification-1',
        'user-1',
        mockTenantId,
      );

      expect(notificationRepository.update).toHaveBeenCalledWith(
        {
          id: 'notification-1',
          recipientId: 'user-1',
          tenantId: mockTenantId,
        },
        {
          isRead: true,
          readAt: expect.any(Date),
        },
      );
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      jest.spyOn(notificationRepository, 'update').mockResolvedValue({} as any);

      await service.markAllNotificationsAsRead('user-1', mockTenantId);

      expect(notificationRepository.update).toHaveBeenCalledWith(
        {
          recipientId: 'user-1',
          tenantId: mockTenantId,
          isRead: false,
        },
        {
          isRead: true,
          readAt: expect.any(Date),
        },
      );
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should return count of unread notifications', async () => {
      jest.spyOn(notificationRepository, 'count').mockResolvedValue(5);

      const count = await service.getUnreadNotificationCount(
        'user-1',
        mockTenantId,
      );

      expect(count).toBe(5);
      expect(notificationRepository.count).toHaveBeenCalledWith({
        where: {
          recipientId: 'user-1',
          tenantId: mockTenantId,
          isRead: false,
        },
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      jest.spyOn(notificationRepository, 'delete').mockResolvedValue({} as any);

      await service.deleteNotification(
        'notification-1',
        'user-1',
        mockTenantId,
      );

      expect(notificationRepository.delete).toHaveBeenCalledWith({
        id: 'notification-1',
        recipientId: 'user-1',
        tenantId: mockTenantId,
      });
    });
  });

  describe('getUserNotificationPreferences', () => {
    it('should return default notification preferences', async () => {
      const preferences = await service.getUserNotificationPreferences(
        'user-1',
        mockTenantId,
      );

      expect(preferences).toEqual({
        emailNotifications: true,
        inAppNotifications: true,
        mentionNotifications: true,
        stageChangeNotifications: true,
        digestFrequency: 'immediate',
      });
    });
  });
});
