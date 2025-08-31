import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationHistoryController } from '../communication-history.controller';
import { CommunicationHistoryService } from '../../services/communication-history.service';
import {
  CommunicationType,
  CommunicationDirection,
  UserRole,
} from '../../../entities';

describe('CommunicationHistoryController', () => {
  let controller: CommunicationHistoryController;
  let service: jest.Mocked<CommunicationHistoryService>;

  const mockCommunicationHistory = {
    id: '1',
    type: CommunicationType.EMAIL,
    direction: CommunicationDirection.OUTBOUND,
    subject: 'Test Subject',
    content: 'Test Content',
    candidateId: 'candidate-1',
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByCandidateId: jest.fn(),
      findByApplicationId: jest.fn(),
      update: jest.fn(),
      markAsRead: jest.fn(),
      remove: jest.fn(),
      getUnreadCount: jest.fn(),
      getCommunicationStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommunicationHistoryController],
      providers: [
        {
          provide: CommunicationHistoryService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CommunicationHistoryController>(
      CommunicationHistoryController,
    );
    service = module.get(CommunicationHistoryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create communication history', async () => {
      const createDto = {
        type: CommunicationType.EMAIL,
        direction: CommunicationDirection.OUTBOUND,
        subject: 'Test Subject',
        content: 'Test Content',
        candidateId: 'candidate-1',
      };

      service.create.mockResolvedValue(mockCommunicationHistory as any);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(
        expect.objectContaining({
          id: '1',
          type: CommunicationType.EMAIL,
          direction: CommunicationDirection.OUTBOUND,
          subject: 'Test Subject',
          content: 'Test Content',
          candidateId: 'candidate-1',
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated communication history', async () => {
      const query = { page: '1', limit: '10' };
      const mockResult = {
        data: [mockCommunicationHistory],
        total: 1,
        page: 1,
        limit: 10,
      };

      service.findAll.mockResolvedValue(mockResult as any);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual({
        data: [expect.objectContaining({ id: '1' })],
        total: 1,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('findByCandidateId', () => {
    it('should return communication history for candidate', async () => {
      service.findByCandidateId.mockResolvedValue([
        mockCommunicationHistory,
      ] as any);

      const result = await controller.findByCandidateId('candidate-1');

      expect(service.findByCandidateId).toHaveBeenCalledWith('candidate-1');
      expect(result).toEqual([expect.objectContaining({ id: '1' })]);
    });
  });

  describe('findByApplicationId', () => {
    it('should return communication history for application', async () => {
      service.findByApplicationId.mockResolvedValue([
        mockCommunicationHistory,
      ] as any);

      const result = await controller.findByApplicationId('application-1');

      expect(service.findByApplicationId).toHaveBeenCalledWith('application-1');
      expect(result).toEqual([expect.objectContaining({ id: '1' })]);
    });
  });

  describe('getCommunicationStats', () => {
    it('should return communication statistics', async () => {
      const mockStats = {
        totalCommunications: 5,
        emailCount: 4,
        inboundCount: 2,
        outboundCount: 3,
        lastCommunication: new Date(),
      };

      service.getCommunicationStats.mockResolvedValue(mockStats);

      const result = await controller.getCommunicationStats('candidate-1');

      expect(service.getCommunicationStats).toHaveBeenCalledWith('candidate-1');
      expect(result).toEqual(mockStats);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      service.getUnreadCount.mockResolvedValue(3);

      const result = await controller.getUnreadCount('candidate-1');

      expect(service.getUnreadCount).toHaveBeenCalledWith('candidate-1');
      expect(result).toEqual({ count: 3 });
    });
  });

  describe('findOne', () => {
    it('should return single communication history', async () => {
      service.findOne.mockResolvedValue(mockCommunicationHistory as any);

      const result = await controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith('1');
      expect(result).toEqual(expect.objectContaining({ id: '1' }));
    });
  });

  describe('update', () => {
    it('should update communication history', async () => {
      const updateDto = { isRead: true };
      const updatedHistory = { ...mockCommunicationHistory, isRead: true };

      service.update.mockResolvedValue(updatedHistory as any);

      const result = await controller.update('1', updateDto);

      expect(service.update).toHaveBeenCalledWith('1', updateDto);
      expect(result.isRead).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('should mark communication as read', async () => {
      const readHistory = {
        ...mockCommunicationHistory,
        isRead: true,
        readAt: new Date(),
      };

      service.markAsRead.mockResolvedValue(readHistory as any);

      const result = await controller.markAsRead('1');

      expect(service.markAsRead).toHaveBeenCalledWith('1');
      expect(result.isRead).toBe(true);
    });
  });

  describe('remove', () => {
    it('should remove communication history', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        message: 'Communication history deleted successfully',
      });
    });
  });
});
