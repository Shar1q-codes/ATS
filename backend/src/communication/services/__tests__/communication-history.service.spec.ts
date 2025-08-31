import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CommunicationHistoryService } from '../communication-history.service';
import {
  CommunicationHistory,
  CommunicationType,
  CommunicationDirection,
} from '../../../entities';

describe('CommunicationHistoryService', () => {
  let service: CommunicationHistoryService;
  let repository: jest.Mocked<Repository<CommunicationHistory>>;

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
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationHistoryService,
        {
          provide: getRepositoryToken(CommunicationHistory),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CommunicationHistoryService>(
      CommunicationHistoryService,
    );
    repository = module.get(getRepositoryToken(CommunicationHistory));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a communication history entry', async () => {
      const createDto = {
        type: CommunicationType.EMAIL,
        direction: CommunicationDirection.OUTBOUND,
        subject: 'Test Subject',
        content: 'Test Content',
        candidateId: 'candidate-1',
      };

      repository.create.mockReturnValue(mockCommunicationHistory as any);
      repository.save.mockResolvedValue(mockCommunicationHistory as any);

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(mockCommunicationHistory);
      expect(result).toEqual(mockCommunicationHistory);
    });
  });

  describe('findAll', () => {
    it('should return paginated communication history', async () => {
      const query = { page: '1', limit: '10' };
      const mockData = [mockCommunicationHistory];
      const mockTotal = 1;

      repository.findAndCount.mockResolvedValue([mockData as any, mockTotal]);

      const result = await service.findAll(query);

      expect(result).toEqual({
        data: mockData,
        total: mockTotal,
        page: 1,
        limit: 10,
      });
    });

    it('should filter by candidateId', async () => {
      const query = { candidateId: 'candidate-1', page: '1', limit: '10' };
      const mockData = [mockCommunicationHistory];

      repository.findAndCount.mockResolvedValue([mockData as any, 1]);

      await service.findAll(query);

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { candidateId: 'candidate-1' },
        relations: ['candidate', 'application', 'initiator'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('findOne', () => {
    it('should return a communication history entry', async () => {
      repository.findOne.mockResolvedValue(mockCommunicationHistory as any);

      const result = await service.findOne('1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['candidate', 'application', 'initiator'],
      });
      expect(result).toEqual(mockCommunicationHistory);
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCandidateId', () => {
    it('should return communication history for a candidate', async () => {
      const mockData = [mockCommunicationHistory];
      repository.find.mockResolvedValue(mockData as any);

      const result = await service.findByCandidateId('candidate-1');

      expect(repository.find).toHaveBeenCalledWith({
        where: { candidateId: 'candidate-1' },
        relations: ['application', 'initiator'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('update', () => {
    it('should update a communication history entry', async () => {
      const updateDto = { isRead: true };
      const updatedEntry = { ...mockCommunicationHistory, isRead: true };

      repository.findOne.mockResolvedValue(mockCommunicationHistory as any);
      repository.save.mockResolvedValue(updatedEntry as any);

      const result = await service.update('1', updateDto);

      expect(result.isRead).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('should mark communication as read', async () => {
      const updatedEntry = {
        ...mockCommunicationHistory,
        isRead: true,
        readAt: new Date(),
      };

      repository.findOne.mockResolvedValue(mockCommunicationHistory as any);
      repository.save.mockResolvedValue(updatedEntry as any);

      const result = await service.markAsRead('1');

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for a candidate', async () => {
      repository.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('candidate-1');

      expect(repository.count).toHaveBeenCalledWith({
        where: {
          candidateId: 'candidate-1',
          isRead: false,
          direction: CommunicationDirection.OUTBOUND,
        },
      });
      expect(result).toBe(5);
    });
  });

  describe('getCommunicationStats', () => {
    it('should return communication statistics', async () => {
      const mockCommunications = [
        {
          type: CommunicationType.EMAIL,
          direction: CommunicationDirection.OUTBOUND,
          createdAt: new Date(),
        },
        {
          type: CommunicationType.EMAIL,
          direction: CommunicationDirection.INBOUND,
          createdAt: new Date(),
        },
      ];

      repository.find.mockResolvedValue(mockCommunications as any);

      const result = await service.getCommunicationStats('candidate-1');

      expect(result).toEqual({
        totalCommunications: 2,
        emailCount: 2,
        inboundCount: 1,
        outboundCount: 1,
        lastCommunication: expect.any(Date),
      });
    });
  });

  describe('logEmailCommunication', () => {
    it('should log email communication', async () => {
      repository.create.mockReturnValue(mockCommunicationHistory as any);
      repository.save.mockResolvedValue(mockCommunicationHistory as any);

      const result = await service.logEmailCommunication(
        'candidate-1',
        'Test Subject',
        'Test Content',
        CommunicationDirection.OUTBOUND,
        'application-1',
        'user-1',
        'email-log-1',
        'from@test.com',
        'to@test.com',
      );

      expect(repository.create).toHaveBeenCalledWith({
        type: CommunicationType.EMAIL,
        direction: CommunicationDirection.OUTBOUND,
        subject: 'Test Subject',
        content: 'Test Content',
        candidateId: 'candidate-1',
        applicationId: 'application-1',
        initiatedBy: 'user-1',
        emailLogId: 'email-log-1',
        fromAddress: 'from@test.com',
        toAddress: 'to@test.com',
      });
      expect(result).toEqual(mockCommunicationHistory);
    });
  });
});
