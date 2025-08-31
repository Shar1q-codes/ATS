import { Test, TestingModule } from '@nestjs/testing';
import { StageHistoryController } from '../stage-history.controller';
import { StageHistoryService } from '../../services/stage-history.service';
import { PipelineStage } from '../../../entities/application.entity';
import { StageHistoryResponseDto } from '../../dto/stage-history-response.dto';

describe('StageHistoryController', () => {
  let controller: StageHistoryController;
  let service: jest.Mocked<StageHistoryService>;

  const mockStageHistoryResponse: StageHistoryResponseDto = {
    id: '123e4567-e89b-12d3-a456-426614174003',
    applicationId: '123e4567-e89b-12d3-a456-426614174000',
    fromStage: null,
    toStage: PipelineStage.APPLIED,
    changedById: 'user-123',
    changedAt: new Date('2024-01-01'),
    notes: 'Initial application',
    automated: true,
  };

  const mockStageStats = {
    totalTransitions: 10,
    automatedTransitions: 6,
    manualTransitions: 4,
    averageTimeInStage: 86400000, // 1 day in milliseconds
  };

  const mockUserActivityStats = {
    totalChanges: 5,
    stageTransitions: {
      'applied -> screening': 3,
      'screening -> shortlisted': 2,
    },
    recentActivity: [mockStageHistoryResponse],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StageHistoryController],
      providers: [
        {
          provide: StageHistoryService,
          useValue: {
            findAll: jest.fn(),
            findAutomatedEntries: jest.fn(),
            findManualEntries: jest.fn(),
            findByApplication: jest.fn(),
            getApplicationTimeline: jest.fn(),
            findByUser: jest.fn(),
            findByStage: jest.fn(),
            getStageTransitionStats: jest.fn(),
            getUserActivityStats: jest.fn(),
            findByDateRange: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StageHistoryController>(StageHistoryController);
    service = module.get(StageHistoryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all stage history entries', async () => {
      service.findAll.mockResolvedValue([mockStageHistoryResponse]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockStageHistoryResponse]);
    });

    it('should return automated entries when automated=true', async () => {
      service.findAutomatedEntries.mockResolvedValue([
        mockStageHistoryResponse,
      ]);

      const result = await controller.findAll(true);

      expect(service.findAutomatedEntries).toHaveBeenCalled();
      expect(result).toEqual([mockStageHistoryResponse]);
    });

    it('should return manual entries when automated=false', async () => {
      const manualEntry = { ...mockStageHistoryResponse, automated: false };
      service.findManualEntries.mockResolvedValue([manualEntry]);

      const result = await controller.findAll(false);

      expect(service.findManualEntries).toHaveBeenCalled();
      expect(result).toEqual([manualEntry]);
    });
  });

  describe('findByApplication', () => {
    it('should return stage history for an application', async () => {
      const applicationId = '123e4567-e89b-12d3-a456-426614174000';
      service.findByApplication.mockResolvedValue([mockStageHistoryResponse]);

      const result = await controller.findByApplication(applicationId);

      expect(service.findByApplication).toHaveBeenCalledWith(applicationId);
      expect(result).toEqual([mockStageHistoryResponse]);
    });
  });

  describe('getApplicationTimeline', () => {
    it('should return application timeline', async () => {
      const applicationId = '123e4567-e89b-12d3-a456-426614174000';
      service.getApplicationTimeline.mockResolvedValue([
        mockStageHistoryResponse,
      ]);

      const result = await controller.getApplicationTimeline(applicationId);

      expect(service.getApplicationTimeline).toHaveBeenCalledWith(
        applicationId,
      );
      expect(result).toEqual([mockStageHistoryResponse]);
    });
  });

  describe('findByUser', () => {
    it('should return stage history by user', async () => {
      const userId = 'user-123';
      service.findByUser.mockResolvedValue([mockStageHistoryResponse]);

      const result = await controller.findByUser(userId);

      expect(service.findByUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual([mockStageHistoryResponse]);
    });
  });

  describe('findMyActivity', () => {
    it('should return current user activity', async () => {
      service.findByUser.mockResolvedValue([mockStageHistoryResponse]);

      const result = await controller.findMyActivity('user-123');

      expect(service.findByUser).toHaveBeenCalledWith('user-123');
      expect(result).toEqual([mockStageHistoryResponse]);
    });
  });

  describe('findByStage', () => {
    it('should return stage history by stage', async () => {
      service.findByStage.mockResolvedValue([mockStageHistoryResponse]);

      const result = await controller.findByStage(PipelineStage.APPLIED);

      expect(service.findByStage).toHaveBeenCalledWith(PipelineStage.APPLIED);
      expect(result).toEqual([mockStageHistoryResponse]);
    });
  });

  describe('getStageTransitionStats', () => {
    it('should return stage transition statistics', async () => {
      service.getStageTransitionStats.mockResolvedValue(mockStageStats);

      const result = await controller.getStageTransitionStats(
        PipelineStage.APPLIED,
      );

      expect(service.getStageTransitionStats).toHaveBeenCalledWith(
        PipelineStage.APPLIED,
      );
      expect(result).toEqual(mockStageStats);
    });
  });

  describe('getUserActivityStats', () => {
    it('should return user activity statistics', async () => {
      const userId = 'user-123';
      service.getUserActivityStats.mockResolvedValue(mockUserActivityStats);

      const result = await controller.getUserActivityStats(userId);

      expect(service.getUserActivityStats).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUserActivityStats);
    });
  });

  describe('getMyActivityStats', () => {
    it('should return current user activity statistics', async () => {
      service.getUserActivityStats.mockResolvedValue(mockUserActivityStats);

      const result = await controller.getMyActivityStats('user-123');

      expect(service.getUserActivityStats).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockUserActivityStats);
    });
  });

  describe('findByDateRange', () => {
    it('should return stage history within date range', async () => {
      service.findByDateRange.mockResolvedValue([mockStageHistoryResponse]);

      const result = await controller.findByDateRange(
        '2024-01-01',
        '2024-01-31',
      );

      expect(service.findByDateRange).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );
      expect(result).toEqual([mockStageHistoryResponse]);
    });
  });

  describe('findOne', () => {
    it('should return a stage history entry by id', async () => {
      const entryId = '123e4567-e89b-12d3-a456-426614174003';
      service.findOne.mockResolvedValue(mockStageHistoryResponse);

      const result = await controller.findOne(entryId);

      expect(service.findOne).toHaveBeenCalledWith(entryId);
      expect(result).toEqual(mockStageHistoryResponse);
    });
  });
});
