import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RealtimeGateway } from '../gateways/realtime.gateway';
import { RealtimeService } from '../services/realtime.service';
import { PresenceService } from '../services/presence.service';
import { NotificationService } from '../services/notification.service';
import { Application } from '../../entities/application.entity';
import { ApplicationNote } from '../../entities/application-note.entity';
import { User } from '../../entities/user.entity';
import { Notification } from '../../entities/notification.entity';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let realtimeService: RealtimeService;
  let presenceService: PresenceService;
  let notificationService: NotificationService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    tenantId: 'tenant-1',
  };

  const mockSocket = {
    id: 'socket-1',
    data: {},
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    handshake: {
      auth: { token: 'valid-token' },
      headers: {},
    },
  };

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        {
          provide: RealtimeService,
          useValue: {
            authenticateSocket: jest.fn(),
            verifyApplicationAccess: jest.fn(),
            updateApplicationStage: jest.fn(),
            addApplicationNote: jest.fn(),
            editApplicationNote: jest.fn(),
          },
        },
        {
          provide: PresenceService,
          useValue: {
            setUserOnline: jest.fn(),
            setUserOffline: jest.fn(),
            isUserOnline: jest.fn(),
            setUserViewingApplication: jest.fn(),
            removeUserFromApplication: jest.fn(),
            getApplicationViewers: jest.fn(),
            getUserSockets: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            createApplicationStageChangeNotification: jest.fn(),
            createMentionNotifications: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Application),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ApplicationNote),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Notification),
          useClass: Repository,
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);
    realtimeService = module.get<RealtimeService>(RealtimeService);
    presenceService = module.get<PresenceService>(PresenceService);
    notificationService = module.get<NotificationService>(NotificationService);

    gateway.server = mockServer as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should authenticate user and set up connection', async () => {
      jest
        .spyOn(realtimeService, 'authenticateSocket')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(presenceService, 'setUserOnline').mockResolvedValue();

      await gateway.handleConnection(mockSocket as any);

      expect(realtimeService.authenticateSocket).toHaveBeenCalledWith(
        mockSocket,
      );
      expect(mockSocket.join).toHaveBeenCalledWith('tenant:tenant-1');
      expect(presenceService.setUserOnline).toHaveBeenCalledWith(
        'user-1',
        'socket-1',
      );
      expect(mockSocket.data.user).toEqual(mockUser);
      expect(mockSocket.data.tenantId).toBe('tenant-1');
    });

    it('should disconnect socket if authentication fails', async () => {
      jest.spyOn(realtimeService, 'authenticateSocket').mockResolvedValue(null);

      await gateway.handleConnection(mockSocket as any);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    beforeEach(() => {
      mockSocket.data.user = mockUser;
    });

    it('should handle user disconnect and update presence', async () => {
      jest.spyOn(presenceService, 'setUserOffline').mockResolvedValue();
      jest.spyOn(presenceService, 'isUserOnline').mockResolvedValue(false);

      await gateway.handleDisconnect(mockSocket as any);

      expect(presenceService.setUserOffline).toHaveBeenCalledWith(
        'user-1',
        'socket-1',
      );
      expect(presenceService.isUserOnline).toHaveBeenCalledWith('user-1');
    });

    it('should not emit offline event if user is still online from other connections', async () => {
      jest.spyOn(presenceService, 'setUserOffline').mockResolvedValue();
      jest.spyOn(presenceService, 'isUserOnline').mockResolvedValue(true);

      await gateway.handleDisconnect(mockSocket as any);

      expect(mockSocket.to).not.toHaveBeenCalled();
    });
  });

  describe('handleJoinApplication', () => {
    beforeEach(() => {
      mockSocket.data.user = mockUser;
    });

    it('should allow user to join application if they have access', async () => {
      const applicationId = 'app-1';
      const currentViewers = [
        { userId: 'user-2', name: 'Jane Doe', joinedAt: new Date() },
      ];

      jest
        .spyOn(realtimeService, 'verifyApplicationAccess')
        .mockResolvedValue(true);
      jest
        .spyOn(presenceService, 'setUserViewingApplication')
        .mockResolvedValue();
      jest
        .spyOn(presenceService, 'getApplicationViewers')
        .mockResolvedValue(currentViewers);

      await gateway.handleJoinApplication(mockSocket as any, { applicationId });

      expect(realtimeService.verifyApplicationAccess).toHaveBeenCalledWith(
        'user-1',
        applicationId,
        'tenant-1',
      );
      expect(mockSocket.join).toHaveBeenCalledWith(
        `application:${applicationId}`,
      );
      expect(presenceService.setUserViewingApplication).toHaveBeenCalledWith(
        'user-1',
        applicationId,
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'application:current_viewers',
        {
          applicationId,
          viewers: currentViewers,
        },
      );
    });

    it('should deny access if user does not have permission', async () => {
      const applicationId = 'app-1';

      jest
        .spyOn(realtimeService, 'verifyApplicationAccess')
        .mockResolvedValue(false);

      await gateway.handleJoinApplication(mockSocket as any, { applicationId });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Access denied to application',
      });
      expect(mockSocket.join).not.toHaveBeenCalled();
    });
  });

  describe('handleStageChange', () => {
    beforeEach(() => {
      mockSocket.data.user = mockUser;
    });

    it('should update application stage and broadcast changes', async () => {
      const stageChangeData = {
        applicationId: 'app-1',
        fromStage: 'applied',
        toStage: 'screening',
        notes: 'Moving to screening',
      };

      jest
        .spyOn(realtimeService, 'updateApplicationStage')
        .mockResolvedValue({} as any);
      jest
        .spyOn(notificationService, 'createApplicationStageChangeNotification')
        .mockResolvedValue();

      await gateway.handleStageChange(mockSocket as any, stageChangeData);

      expect(realtimeService.updateApplicationStage).toHaveBeenCalledWith(
        'app-1',
        'applied',
        'screening',
        'user-1',
        'tenant-1',
        'Moving to screening',
      );

      expect(mockServer.to).toHaveBeenCalledWith('tenant:tenant-1');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'application:stage_updated',
        expect.objectContaining({
          applicationId: 'app-1',
          fromStage: 'applied',
          toStage: 'screening',
          updatedBy: {
            id: 'user-1',
            name: 'John Doe',
          },
          notes: 'Moving to screening',
        }),
      );

      expect(
        notificationService.createApplicationStageChangeNotification,
      ).toHaveBeenCalledWith(
        'app-1',
        'applied',
        'screening',
        'user-1',
        'tenant-1',
      );
    });

    it('should emit error if stage update fails', async () => {
      const stageChangeData = {
        applicationId: 'app-1',
        fromStage: 'applied',
        toStage: 'screening',
      };

      jest
        .spyOn(realtimeService, 'updateApplicationStage')
        .mockRejectedValue(new Error('Update failed'));

      await gateway.handleStageChange(mockSocket as any, stageChangeData);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to update application stage',
      });
    });
  });

  describe('handleAddNote', () => {
    beforeEach(() => {
      mockSocket.data.user = mockUser;
    });

    it('should add note and broadcast to application viewers', async () => {
      const noteData = {
        applicationId: 'app-1',
        content: 'This is a test note',
        mentions: ['user-2'],
      };

      const mockNote = {
        id: 'note-1',
        content: 'This is a test note',
        createdAt: new Date(),
        applicationId: 'app-1',
      };

      jest
        .spyOn(realtimeService, 'addApplicationNote')
        .mockResolvedValue(mockNote as any);
      jest
        .spyOn(notificationService, 'createMentionNotifications')
        .mockResolvedValue();

      await gateway.handleAddNote(mockSocket as any, noteData);

      expect(realtimeService.addApplicationNote).toHaveBeenCalledWith(
        'app-1',
        'This is a test note',
        'user-1',
        'tenant-1',
        ['user-2'],
      );

      expect(mockServer.to).toHaveBeenCalledWith('application:app-1');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'application:note_added',
        expect.objectContaining({
          note: expect.objectContaining({
            id: 'note-1',
            content: 'This is a test note',
            author: {
              id: 'user-1',
              name: 'John Doe',
            },
          }),
          applicationId: 'app-1',
        }),
      );

      expect(
        notificationService.createMentionNotifications,
      ).toHaveBeenCalledWith(
        'app-1',
        'note-1',
        ['user-2'],
        'user-1',
        'tenant-1',
      );
    });

    it('should emit error if note creation fails', async () => {
      const noteData = {
        applicationId: 'app-1',
        content: 'This is a test note',
      };

      jest
        .spyOn(realtimeService, 'addApplicationNote')
        .mockRejectedValue(new Error('Note creation failed'));

      await gateway.handleAddNote(mockSocket as any, noteData);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to add note',
      });
    });
  });

  describe('handleTypingStart', () => {
    beforeEach(() => {
      mockSocket.data.user = mockUser;
    });

    it('should broadcast typing start event', async () => {
      const typingData = { applicationId: 'app-1' };

      await gateway.handleTypingStart(mockSocket as any, typingData);

      expect(mockSocket.to).toHaveBeenCalledWith('application:app-1');
      expect(mockSocket.to().emit).toHaveBeenCalledWith('typing:user_started', {
        userId: 'user-1',
        name: 'John Doe',
        applicationId: 'app-1',
      });
    });
  });

  describe('handleTypingStop', () => {
    beforeEach(() => {
      mockSocket.data.user = mockUser;
    });

    it('should broadcast typing stop event', async () => {
      const typingData = { applicationId: 'app-1' };

      await gateway.handleTypingStop(mockSocket as any, typingData);

      expect(mockSocket.to).toHaveBeenCalledWith('application:app-1');
      expect(mockSocket.to().emit).toHaveBeenCalledWith('typing:user_stopped', {
        userId: 'user-1',
        applicationId: 'app-1',
      });
    });
  });
});
