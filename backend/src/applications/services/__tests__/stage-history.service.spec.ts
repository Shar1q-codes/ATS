import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { StageHistoryService } from '../stage-history.service';
import { StageHistoryEntry } from '../../../entities/stage-history-entry.entity';
import { PipelineStage } from '../../../entities/application.entity';

describe('StageHistoryService', () => {
  let service: StageHistoryService;
  let stageHistoryRepository: jest.Mocked<Repository<StageHistoryEntry>>;

  const mockStageHistoryEntry: StageHistoryEntry = {
    id: '123e4567-e89b-12d3-a456-426614174003',
    applicationId: '123e4567-e89b-12d3-a456-426614174000',
    fromStage: null,
    toStage: PipelineStage.APPLIED,
    changedById: 'user-123',
    changedAt: new Date('2024-01-01'),
    notes: 'Initial application',
    automated: true,
    application: null,
    changedBy: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StageHistoryService,
        {
          provide: getRepositoryToken(StageHistoryEntry),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StageHistoryService>(StageHistoryService);
    stageHistoryRepository = module.get(getRepositoryToken(StageHistoryEntry));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all stage history entries', async () => {
      stageHistoryRepository.find.mockResolvedValue([mockStageHistoryEntry]);

      const result = await service.findAll();

      expect(stageHistoryRepository.find).toHaveBeenCalledWith({
        relations: ['changedBy'],
        order: { changedAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockStageHistoryEntry.id);
    });
  });

  describe('findByApplication', () => {
    it('should return stage history for an application', async () => {
      stageHistoryRepository.find.mockResolvedValue([mockStageHistoryEntry]);

      const result = await service.findByApplication(
        mockStageHistoryEntry.applicationId,
      );

      expect(stageHistoryRepository.find).toHaveBeenCalledWith({
        where: { applicationId: mockStageHistoryEntry.applicationId },
        relations: ['changedBy'],
        order: { changedAt: 'ASC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].applicationId).toBe(mockStageHistoryEntry.applicationId);
    });
  });

  describe('findOne', () => {
    it('should return a stage history entry by id', async () => {
      stageHistoryRepository.findOne.mockResolvedValue(mockStageHistoryEntry);

      const result = await service.findOne(mockStageHistoryEntry.id);

      expect(stageHistoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockStageHistoryEntry.id },
        relations: ['changedBy'],
      });
      expect(result.id).toBe(mockStageHistoryEntry.id);
    });

    it('should throw NotFoundException if entry not found', async () => {
      stageHistoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByUser', () => {
    it('should return stage history entries by user', async () => {
      stageHistoryRepository.find.mockResolvedValue([mockStageHistoryEntry]);

      const result = await service.findByUser('user-123');

      expect(stageHistoryRepository.find).toHaveBeenCalledWith({
        where: { changedById: 'user-123' },
        relations: ['changedBy'],
        order: { changedAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].changedById).toBe('user-123');
    });
  });

  describe('findByStage', () => {
    it('should return stage history entries by stage', async () => {
      stageHistoryRepository.find.mockResolvedValue([mockStageHistoryEntry]);

      const result = await service.findByStage(PipelineStage.APPLIED);

      expect(stageHistoryRepository.find).toHaveBeenCalledWith({
        where: { toStage: PipelineStage.APPLIED },
        relations: ['changedBy'],
        order: { changedAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].toStage).toBe(PipelineStage.APPLIED);
    });
  });

  describe('findAutomatedEntries', () => {
    it('should return automated stage history entries', async () => {
      stageHistoryRepository.find.mockResolvedValue([mockStageHistoryEntry]);

      const result = await service.findAutomatedEntries();

      expect(stageHistoryRepository.find).toHaveBeenCalledWith({
        where: { automated: true },
        relations: ['changedBy'],
        order: { changedAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].automated).toBe(true);
    });
  });

  describe('findManualEntries', () => {
    it('should return manual stage history entries', async () => {
      const manualEntry = { ...mockStageHistoryEntry, automated: false };
      stageHistoryRepository.find.mockResolvedValue([manualEntry]);

      const result = await service.findManualEntries();

      expect(stageHistoryRepository.find).toHaveBeenCalledWith({
        where: { automated: false },
        relations: ['changedBy'],
        order: { changedAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].automated).toBe(false);
    });
  });

  describe('findByDateRange', () => {
    it('should return stage history entries within date range', async () => {
      stageHistoryRepository.find.mockResolvedValue([mockStageHistoryEntry]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const result = await service.findByDateRange(startDate, endDate);

      expect(stageHistoryRepository.find).toHaveBeenCalledWith({
        where: {
          changedAt: expect.any(Object), // Between object
        },
        relations: ['changedBy'],
        order: { changedAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('getApplicationTimeline', () => {
    it('should return application timeline', async () => {
      stageHistoryRepository.find.mockResolvedValue([mockStageHistoryEntry]);

      const result = await service.getApplicationTimeline(
        mockStageHistoryEntry.applicationId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].applicationId).toBe(mockStageHistoryEntry.applicationId);
    });
  });

  describe('getStageTransitionStats', () => {
    it('should return stage transition statistics', async () => {
      const entries = [
        mockStageHistoryEntry,
        { ...mockStageHistoryEntry, automated: false },
      ];
      stageHistoryRepository.find.mockResolvedValue(entries);

      const result = await service.getStageTransitionStats(
        PipelineStage.APPLIED,
      );

      expect(result.totalTransitions).toBe(2);
      expect(result.automatedTransitions).toBe(1);
      expect(result.manualTransitions).toBe(1);
    });
  });

  describe('getUserActivityStats', () => {
    it('should return user activity statistics', async () => {
      const manualEntry = { ...mockStageHistoryEntry, automated: false };
      stageHistoryRepository.find.mockResolvedValue([manualEntry]);

      const result = await service.getUserActivityStats('user-123');

      expect(result.totalChanges).toBe(1);
      expect(result.stageTransitions).toHaveProperty('initial -> applied');
      expect(result.recentActivity).toHaveLength(1);
    });
  });
});
