import { Test, TestingModule } from '@nestjs/testing';
import { MatchingProcessor } from '../matching.processor';
import { ApplicationService } from '../../services/application.service';

describe('MatchingProcessor', () => {
  let processor: MatchingProcessor;
  let mockApplicationService: jest.Mocked<ApplicationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingProcessor,
        {
          provide: ApplicationService,
          useValue: {
            calculateAndUpdateFitScore: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<MatchingProcessor>(MatchingProcessor);
    mockApplicationService = module.get(ApplicationService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleFitScoreCalculation', () => {
    it('should process fit score calculation job successfully', async () => {
      const jobData = { applicationId: 'test-app-id' };
      const job = { data: jobData } as any;

      mockApplicationService.calculateAndUpdateFitScore.mockResolvedValue(
        undefined,
      );

      await processor.handleFitScoreCalculation(job);

      expect(
        mockApplicationService.calculateAndUpdateFitScore,
      ).toHaveBeenCalledWith('test-app-id');
    });

    it('should throw error when application service fails', async () => {
      const jobData = { applicationId: 'test-app-id' };
      const job = { data: jobData } as any;
      const error = new Error('Application not found');

      mockApplicationService.calculateAndUpdateFitScore.mockRejectedValue(
        error,
      );

      await expect(processor.handleFitScoreCalculation(job)).rejects.toThrow(
        'Application not found',
      );
      expect(
        mockApplicationService.calculateAndUpdateFitScore,
      ).toHaveBeenCalledWith('test-app-id');
    });
  });
});
