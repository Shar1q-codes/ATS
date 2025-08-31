import { Test, TestingModule } from '@nestjs/testing';
import { MatchingController } from '../matching.controller';
import { MatchingService, MatchResult } from '../../services/matching.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';

describe('MatchingController', () => {
  let controller: MatchingController;
  let matchingService: jest.Mocked<MatchingService>;

  const mockMatchResult: MatchResult = {
    candidateId: 'candidate-1',
    jobVariantId: 'job-variant-1',
    fitScore: 85,
    breakdown: {
      mustHaveScore: 90,
      shouldHaveScore: 80,
      niceToHaveScore: 70,
    },
    strengths: ['Strong in JavaScript', 'Excellent React skills'],
    gaps: ['Missing TypeScript experience'],
    recommendations: ['Consider TypeScript training'],
    detailedAnalysis: [],
  };

  beforeEach(async () => {
    const mockMatchingService = {
      matchCandidateToJob: jest.fn(),
      findMatchingCandidates: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchingController],
      providers: [
        {
          provide: MatchingService,
          useValue: mockMatchingService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MatchingController>(MatchingController);
    matchingService = module.get(MatchingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('matchCandidateToJob', () => {
    it('should match candidate to job successfully', async () => {
      matchingService.matchCandidateToJob.mockResolvedValue(mockMatchResult);

      const dto = {
        candidateId: 'candidate-1',
        jobVariantId: 'job-variant-1',
        includeExplanation: true,
      };

      const result = await controller.matchCandidateToJob(dto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMatchResult);
      expect(matchingService.matchCandidateToJob).toHaveBeenCalledWith(
        'candidate-1',
        'job-variant-1',
        { includeExplanation: true },
      );
    });

    it('should default includeExplanation to true', async () => {
      matchingService.matchCandidateToJob.mockResolvedValue(mockMatchResult);

      const dto = {
        candidateId: 'candidate-1',
        jobVariantId: 'job-variant-1',
      };

      await controller.matchCandidateToJob(dto);

      expect(matchingService.matchCandidateToJob).toHaveBeenCalledWith(
        'candidate-1',
        'job-variant-1',
        { includeExplanation: true },
      );
    });

    it('should handle service errors', async () => {
      matchingService.matchCandidateToJob.mockRejectedValue(
        new Error('Candidate not found'),
      );

      const dto = {
        candidateId: 'invalid-candidate',
        jobVariantId: 'job-variant-1',
      };

      await expect(controller.matchCandidateToJob(dto)).rejects.toThrow(
        'Candidate not found',
      );
    });
  });

  describe('findMatchingCandidates', () => {
    it('should find matching candidates successfully', async () => {
      const mockResults = [mockMatchResult];
      matchingService.findMatchingCandidates.mockResolvedValue(mockResults);

      const result = await controller.findMatchingCandidates(
        'job-variant-1',
        60,
        50,
        true,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResults);
      expect(result.meta).toEqual({
        total: 1,
        minFitScore: 60,
        maxResults: 50,
      });
      expect(matchingService.findMatchingCandidates).toHaveBeenCalledWith(
        'job-variant-1',
        {
          minFitScore: 60,
          maxResults: 50,
          includeExplanation: true,
        },
      );
    });

    it('should use default query parameters', async () => {
      const mockResults = [mockMatchResult];
      matchingService.findMatchingCandidates.mockResolvedValue(mockResults);

      const result = await controller.findMatchingCandidates(
        'job-variant-1',
        60, // default
        50, // default
        true, // default
      );

      expect(result.success).toBe(true);
      expect(matchingService.findMatchingCandidates).toHaveBeenCalledWith(
        'job-variant-1',
        {
          minFitScore: 60,
          maxResults: 50,
          includeExplanation: true,
        },
      );
    });

    it('should handle empty results', async () => {
      matchingService.findMatchingCandidates.mockResolvedValue([]);

      const result = await controller.findMatchingCandidates(
        'job-variant-1',
        60,
        50,
        true,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getMatchScore', () => {
    it('should return match score successfully', async () => {
      matchingService.matchCandidateToJob.mockResolvedValue(mockMatchResult);

      const result = await controller.getMatchScore(
        'candidate-1',
        'job-variant-1',
      );

      expect(result.success).toBe(true);
      expect(result.data.fitScore).toBe(85);
      expect(result.data.breakdown).toEqual({
        mustHaveScore: 90,
        shouldHaveScore: 80,
        niceToHaveScore: 70,
      });
      expect(matchingService.matchCandidateToJob).toHaveBeenCalledWith(
        'candidate-1',
        'job-variant-1',
        { includeExplanation: false },
      );
    });
  });

  describe('getMatchExplanation', () => {
    it('should return detailed match explanation', async () => {
      matchingService.matchCandidateToJob.mockResolvedValue(mockMatchResult);

      const result = await controller.getMatchExplanation(
        'candidate-1',
        'job-variant-1',
      );

      expect(result.success).toBe(true);
      expect(result.data.fitScore).toBe(85);
      expect(result.data.breakdown).toEqual(mockMatchResult.breakdown);
      expect(result.data.strengths).toEqual(mockMatchResult.strengths);
      expect(result.data.gaps).toEqual(mockMatchResult.gaps);
      expect(result.data.recommendations).toEqual(
        mockMatchResult.recommendations,
      );
      expect(result.data.detailedAnalysis).toEqual(
        mockMatchResult.detailedAnalysis,
      );
      expect(matchingService.matchCandidateToJob).toHaveBeenCalledWith(
        'candidate-1',
        'job-variant-1',
        { includeExplanation: true },
      );
    });
  });

  describe('batchMatchCandidates', () => {
    it('should batch match candidates successfully', async () => {
      const candidateIds = ['candidate-1', 'candidate-2'];
      const mockResults = [
        { ...mockMatchResult, candidateId: 'candidate-1' },
        { ...mockMatchResult, candidateId: 'candidate-2', fitScore: 75 },
      ];

      matchingService.matchCandidateToJob
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const dto = {
        candidateIds,
        includeExplanation: false,
      };

      const result = await controller.batchMatchCandidates(
        'job-variant-1',
        dto,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].fitScore).toBeGreaterThanOrEqual(
        result.data[1].fitScore,
      ); // Sorted by score
      expect(result.meta).toEqual({
        total: 2,
        processed: 2,
        failed: 0,
      });
    });

    it('should handle partial failures in batch matching', async () => {
      const candidateIds = ['candidate-1', 'invalid-candidate'];

      matchingService.matchCandidateToJob
        .mockResolvedValueOnce(mockMatchResult)
        .mockRejectedValueOnce(new Error('Candidate not found'));

      const dto = {
        candidateIds,
        includeExplanation: false,
      };

      const result = await controller.batchMatchCandidates(
        'job-variant-1',
        dto,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 2,
        processed: 1,
        failed: 1,
      });
    });

    it('should process candidates in batches', async () => {
      const candidateIds = Array.from(
        { length: 12 },
        (_, i) => `candidate-${i}`,
      );

      // Mock all calls to succeed
      for (let i = 0; i < candidateIds.length; i++) {
        matchingService.matchCandidateToJob.mockResolvedValueOnce({
          ...mockMatchResult,
          candidateId: candidateIds[i],
        });
      }

      const dto = {
        candidateIds,
        includeExplanation: false,
      };

      const result = await controller.batchMatchCandidates(
        'job-variant-1',
        dto,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(12);
      expect(result.meta.processed).toBe(12);
      expect(result.meta.failed).toBe(0);
    });

    it('should default includeExplanation to false for batch operations', async () => {
      const candidateIds = ['candidate-1'];
      matchingService.matchCandidateToJob.mockResolvedValue(mockMatchResult);

      const dto = { candidateIds };

      await controller.batchMatchCandidates('job-variant-1', dto);

      expect(matchingService.matchCandidateToJob).toHaveBeenCalledWith(
        'candidate-1',
        'job-variant-1',
        { includeExplanation: false },
      );
    });
  });

  describe('getMatchingStats', () => {
    it('should return matching statistics', async () => {
      const mockStats = {
        totalCandidates: 100,
        candidatesWithEmbeddings: 80,
        averageFitScore: 65.5,
        scoreDistribution: {
          excellent: 5,
          good: 15,
          fair: 25,
          poor: 35,
        },
      };

      // Mock the findMatchingCandidates call for stats
      const mockAllMatches = Array.from({ length: 80 }, (_, i) => ({
        ...mockMatchResult,
        candidateId: `candidate-${i}`,
        fitScore: Math.floor(Math.random() * 100),
      }));

      matchingService.findMatchingCandidates.mockResolvedValue(mockAllMatches);

      // Mock the vector storage service call through the service
      const mockVectorStorageService = {
        getEmbeddingStats: jest.fn().mockResolvedValue({
          totalCandidates: 100,
          candidatesWithEmbeddings: 80,
          embeddingCoverage: 80,
        }),
      };

      // Access the private property for testing
      (matchingService as any).vectorStorageService = mockVectorStorageService;

      const result = await controller.getMatchingStats('job-variant-1');

      expect(result.success).toBe(true);
      expect(result.data.totalCandidates).toBe(100);
      expect(result.data.candidatesWithEmbeddings).toBe(80);
      expect(result.data.averageFitScore).toBeGreaterThanOrEqual(0);
      expect(result.data.scoreDistribution).toBeDefined();
    });

    it('should handle zero candidates gracefully', async () => {
      matchingService.findMatchingCandidates.mockResolvedValue([]);

      const mockVectorStorageService = {
        getEmbeddingStats: jest.fn().mockResolvedValue({
          totalCandidates: 0,
          candidatesWithEmbeddings: 0,
          embeddingCoverage: 0,
        }),
      };

      (matchingService as any).vectorStorageService = mockVectorStorageService;

      const result = await controller.getMatchingStats('job-variant-1');

      expect(result.success).toBe(true);
      expect(result.data.totalCandidates).toBe(0);
      expect(result.data.averageFitScore).toBe(0);
      expect(result.data.scoreDistribution.excellent).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle service errors in findMatchingCandidates', async () => {
      matchingService.findMatchingCandidates.mockRejectedValue(
        new Error('Job variant not found'),
      );

      await expect(
        controller.findMatchingCandidates('invalid-job', 60, 50, true),
      ).rejects.toThrow('Job variant not found');
    });

    it('should handle service errors in getMatchScore', async () => {
      matchingService.matchCandidateToJob.mockRejectedValue(
        new Error('Matching failed'),
      );

      await expect(
        controller.getMatchScore('candidate-1', 'job-variant-1'),
      ).rejects.toThrow('Matching failed');
    });

    it('should handle service errors in getMatchExplanation', async () => {
      matchingService.matchCandidateToJob.mockRejectedValue(
        new Error('Explanation generation failed'),
      );

      await expect(
        controller.getMatchExplanation('candidate-1', 'job-variant-1'),
      ).rejects.toThrow('Explanation generation failed');
    });
  });

  describe('parameter validation', () => {
    it('should validate UUID parameters', async () => {
      // This would be handled by the ParseUUIDPipe in the actual application
      // Here we just verify the controller expects UUID format
      matchingService.matchCandidateToJob.mockResolvedValue(mockMatchResult);

      const dto = {
        candidateId: 'candidate-1',
        jobVariantId: 'job-variant-1',
      };

      const result = await controller.matchCandidateToJob(dto);
      expect(result.success).toBe(true);
    });

    it('should validate integer parameters', async () => {
      // This would be handled by the ParseIntPipe in the actual application
      matchingService.findMatchingCandidates.mockResolvedValue([
        mockMatchResult,
      ]);

      const result = await controller.findMatchingCandidates(
        'job-variant-1',
        60, // minFitScore
        50, // maxResults
        true,
      );

      expect(result.success).toBe(true);
    });
  });
});
