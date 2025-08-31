import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PresenceService } from '../services/presence.service';
import { User } from '../../entities/user.entity';

describe('PresenceService', () => {
  let service: PresenceService;
  let userRepository: Repository<User>;

  const mockUser = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PresenceService>(PresenceService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear the internal maps
    (service as any).userPresence.clear();
    (service as any).applicationViewers.clear();
  });

  describe('setUserOnline', () => {
    it('should create new presence record for new user', async () => {
      await service.setUserOnline('user-1', 'socket-1');

      const isOnline = await service.isUserOnline('user-1');
      expect(isOnline).toBe(true);

      const sockets = await service.getUserSockets('user-1');
      expect(sockets).toEqual(['socket-1']);
    });

    it('should add socket to existing user presence', async () => {
      await service.setUserOnline('user-1', 'socket-1');
      await service.setUserOnline('user-1', 'socket-2');

      const sockets = await service.getUserSockets('user-1');
      expect(sockets).toHaveLength(2);
      expect(sockets).toContain('socket-1');
      expect(sockets).toContain('socket-2');
    });
  });

  describe('setUserOffline', () => {
    it('should remove socket from user presence', async () => {
      await service.setUserOnline('user-1', 'socket-1');
      await service.setUserOnline('user-1', 'socket-2');

      await service.setUserOffline('user-1', 'socket-1');

      const sockets = await service.getUserSockets('user-1');
      expect(sockets).toEqual(['socket-2']);
      expect(await service.isUserOnline('user-1')).toBe(true);
    });

    it('should remove user presence when last socket disconnects', async () => {
      await service.setUserOnline('user-1', 'socket-1');
      await service.setUserOffline('user-1', 'socket-1');

      expect(await service.isUserOnline('user-1')).toBe(false);
      expect(await service.getUserSockets('user-1')).toEqual([]);
    });
  });

  describe('setUserViewingApplication', () => {
    it('should add user to application viewers', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);

      await service.setUserOnline('user-1', 'socket-1');
      await service.setUserViewingApplication('user-1', 'app-1');

      const viewers = await service.getApplicationViewers('app-1');
      expect(viewers).toHaveLength(1);
      expect(viewers[0]).toMatchObject({
        userId: 'user-1',
        name: 'John Doe',
      });

      const userApps = await service.getUserCurrentApplications('user-1');
      expect(userApps).toEqual(['app-1']);
    });

    it('should handle multiple users viewing same application', async () => {
      const mockUser2 = { id: 'user-2', firstName: 'Jane', lastName: 'Smith' };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockUser2 as any);

      await service.setUserOnline('user-1', 'socket-1');
      await service.setUserOnline('user-2', 'socket-2');
      await service.setUserViewingApplication('user-1', 'app-1');
      await service.setUserViewingApplication('user-2', 'app-1');

      const viewers = await service.getApplicationViewers('app-1');
      expect(viewers).toHaveLength(2);
      expect(viewers.map((v) => v.userId)).toContain('user-1');
      expect(viewers.map((v) => v.userId)).toContain('user-2');
    });
  });

  describe('removeUserFromApplication', () => {
    it('should remove user from application viewers', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);

      await service.setUserOnline('user-1', 'socket-1');
      await service.setUserViewingApplication('user-1', 'app-1');
      await service.removeUserFromApplication('user-1', 'app-1');

      const viewers = await service.getApplicationViewers('app-1');
      expect(viewers).toHaveLength(0);

      const userApps = await service.getUserCurrentApplications('user-1');
      expect(userApps).toEqual([]);
    });

    it('should clean up empty application viewer maps', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);

      await service.setUserOnline('user-1', 'socket-1');
      await service.setUserViewingApplication('user-1', 'app-1');
      await service.removeUserFromApplication('user-1', 'app-1');

      // Check that the internal map is cleaned up
      const applicationViewers = (service as any).applicationViewers;
      expect(applicationViewers.has('app-1')).toBe(false);
    });
  });

  describe('getOnlineUsers', () => {
    it('should return list of online users', async () => {
      await service.setUserOnline('user-1', 'socket-1');
      await service.setUserOnline('user-2', 'socket-2');

      const onlineUsers = await service.getOnlineUsers();
      expect(onlineUsers).toHaveLength(2);
      expect(onlineUsers).toContain('user-1');
      expect(onlineUsers).toContain('user-2');
    });

    it('should not include users with no active sockets', async () => {
      await service.setUserOnline('user-1', 'socket-1');
      await service.setUserOnline('user-2', 'socket-2');
      await service.setUserOffline('user-1', 'socket-1');

      const onlineUsers = await service.getOnlineUsers();
      expect(onlineUsers).toEqual(['user-2']);
    });
  });

  describe('getPresenceStats', () => {
    it('should return correct presence statistics', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);

      await service.setUserOnline('user-1', 'socket-1');
      await service.setUserOnline('user-2', 'socket-2');
      await service.setUserViewingApplication('user-1', 'app-1');
      await service.setUserViewingApplication('user-2', 'app-1');
      await service.setUserViewingApplication('user-1', 'app-2');

      const stats = await service.getPresenceStats();
      expect(stats).toEqual({
        totalOnlineUsers: 2,
        totalApplicationsBeingViewed: 2,
        averageViewersPerApplication: 1.5, // (2 + 1) / 2
      });
    });

    it('should handle empty presence data', async () => {
      const stats = await service.getPresenceStats();
      expect(stats).toEqual({
        totalOnlineUsers: 0,
        totalApplicationsBeingViewed: 0,
        averageViewersPerApplication: 0,
      });
    });
  });

  describe('cleanupStalePresence', () => {
    it('should remove stale presence data', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);

      await service.setUserOnline('user-1', 'socket-1');
      await service.setUserViewingApplication('user-1', 'app-1');

      // Manually set lastSeen to old date
      const userPresence = (service as any).userPresence.get('user-1');
      userPresence.lastSeen = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

      await service.cleanupStalePresence();

      expect(await service.isUserOnline('user-1')).toBe(false);
      expect(await service.getApplicationViewers('app-1')).toHaveLength(0);
    });

    it('should not remove recent presence data', async () => {
      await service.setUserOnline('user-1', 'socket-1');

      await service.cleanupStalePresence();

      expect(await service.isUserOnline('user-1')).toBe(true);
    });
  });
});
