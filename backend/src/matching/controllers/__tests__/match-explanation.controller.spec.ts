import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchExplanationController } from '../match-explanation.controller';
import { MatchExplanationService } from '../../services/match-explanation.service';
import { MatchingService } from '../../services/matching.service';
import { Application } from '../../../entities/application.entity';
import { Candidate } from '../../../entities/candidate.entity';
import { CompanyJobVariant } from '../../../entities/company-job-variant.entity';
import { MatchExplanation } from '../../../entities/match-explanation.entity';
import { MatchResult } from '../../services/matching.service';
import {
  RequirementItem,
  RequirementCategory,
  RequirementType,
} from '../../../entities/requirement-item.entity';

describe('MatchExplanationController', () => {
  let controller: MatchExplanationController;
  let matchExplanationService: jest.Mocked<MatchExplanationService>;
  let matchingService: jest.Mocked<MatchingService>;
  let applicationRepository: jest.Mocked<Repository<Application>>;
  let candidateRepository: jest.Mocked<Repository<Candidate>>;
  let jobVariantRepository: jest.Mocked<Repository<CompanyJobVariant>>;

  const mockCandidate: Candidate = {
    id: 'candidate-1',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    location: 'New York, NY',
    linkedinUrl: 'https://linkedin.com/in/johndoe',
    portfolioUrl: 'https://johndoe.dev',
    resumeUrl: 'https://example.com/resume.pdf',
    skillEmbeddings: [0.1, 0.2, 0.3],
    createdAt: new Date(),
    updatedAt: new Date(),
    consentGiven: true,
    consentDate: new Date(),
    parsedData: {
      id: 'parsed-1',
      candidateId: 'candidate-1',
      skills: [
        {
          name: 'JavaScript',
          yearsOfExperience: 5,
          proficiencyLevel: 'Expert',
        },
      ],
      experience: [],
      education: [],
      certifications: [],
      summary: 'Experienced developer',
      totalExperience: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    applications: [],
  };

  const mockJobVariant: CompanyJobVariant = {
    id: 'job-variant-1',
    jobTemplateId: 'template-1',
    companyProfileId: 'company-1',
    customTitle: 'Senior Developer',
    customDescription: 'Looking for a senior developer',
    isActive: true,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    jobTemplate: {
      id: 'template-1',
      jobFamilyId: 'family-1',
      name: 'Developer',
      level: 'senior',
      experienceRange: { min: 3, max: 7 },
      salaryRange: { min: 80000, max: 120000, currency: 'USD' },
      createdAt: new Date(),
      updatedAt: new Date(),
      jobFamily: null,
      requirements: [],
      companyJobVariants: [],
    },
    companyProfile: {
      id: 'company-1',
      name: 'Tech Company',
      industry: 'Technology',
      size: 'small',
      culture: ['innovative'],
      benefits: ['health insurance'],
      workArrangement: 'remote',
      location: 'San Francisco, CA',
      preferences: {
        prioritySkills: ['JavaScript'],
        dealBreakers: [],
        niceToHave: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      companyJobVariants: [],
    },
    requirements: [],
    jdVersions: [],
  };

  const mockApplication: Application = {
    id: 'app-1',
    candidateId: 'candidate-1',
    companyJobVariantId: 'job-variant-1',
    status: 'applied',
    fitScore: 85,
    appliedAt: new Date(),
    lastUpdated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    candidate: mockCandidate,
    companyJobVariant: mockJobVariant,
    notes: [],
    stageHistory: [],
    matchExplanation: null,
  };

  const mockMatchResult: MatchResult = {
    candidateId: 'candidate-1',
    jobVariantId: 'job-variant-1',
    fitScore: 85,
    breakdown: {
      mustHaveScore: 90,
      shouldHaveScore: 80,
      niceToHaveScore: 75,
    },
    strengths: ['Strong JavaScript skills'],
    gaps: ['Missing React experience'],
    recommendations: ['Learn React framework'],
    detailedAnalysis: [
      {
        requirement: {
          id: 'req-1',
          type: RequirementType.SKILL,
          category: RequirementCategory.MUST,
          description: 'JavaScript proficiency',
          weight: 9,
          alternatives: [],
          jobTemplateId: 'template-1',
          companyJobVariantId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          jobTemplate: null,
          companyJobVariant: null,
        },
        matched: true,
        confidence: 0.9,
        evidence: ['5 years JavaScript experience'],
        explanation: 'Strong match for JavaScript requirement',
      },
    ],
  };

  const mockMatchExplanation: MatchExplanation = {
    id: 'explanation-1',
    applicationId: 'app-1',
    overallScore: 85,
    mustHaveScore: 90,
    shouldHaveScore: 80,
    niceToHaveScore: 75,
    strengths: ['Strong JavaScript skills'],
    gaps: ['Missing React experience'],
    recommendations: ['Learn React framework'],
    detailedAnalysis: mockMatchResult.detailedAnalysis,
    createdAt: new Date(),
    application: mockApplication,
  };

  beforeEach(async () => {
    const mockMatchExplanationService = {
      generateMatchExplanation: jest.fn(),
      updateMatchExplanation: jest.fn(),
      getMatchExplanation: jest.fn(),
      deleteMatchExplanation: jest.fn(),
    };

    const mockMatchingService = {
      matchCandidateToJob: jest.fn(),
    };

    const mockApplicationRepository = {
      findOne: jest.fn(),
    };

    const mockCandidateRepository = {
      findOne: jest.fn(),
    };

    const mockJobVariantRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchExplanationController],
      providers: [
        {
          provide: MatchExplanationService,
          useValue: mockMatchExplanationService,
        },
        {
          provide: MatchingService,
          useValue: mockMatchingService,
        },
        {
          provide: getRepositoryToken(Application),
          useValue: mockApplicationRepository,
        },
        {
          provide: getRepositoryToken(Candidate),
          useValue: mockCandidateRepository,
        },
        {
          provide: getRepositoryToken(CompanyJobVariant),
          useValue: mockJobVariantRepository,
        },
      ],
    }).compile();

    controller = module.get<MatchExplanationController>(
      MatchExplanationController,
    );
    matchExplanationService = module.get(MatchExplanationService);
    matchingService = module.get(MatchingService);
    applicationRepository = module.get(getRepositoryToken(Application));
    candidateRepository = module.get(getRepositoryToken(Candidate));
    jobVariantRepository = module.get(getRepositoryToken(CompanyJobVariant));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateExplanation', () => {
    const generateDto = {
      applicationId: 'app-1',
      includeDetailedAnalysis: true,
      includeRecommendations: true,
      maxExplanationLength: 2000,
    };

    it('should generate match explanation successfully', async () => {
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      jobVariantRepository.findOne.mockResolvedValue(mockJobVariant);
      matchingService.matchCandidateToJob.mockResolvedValue(mockMatchResult);
      matchExplanationService.generateMatchExplanation.mockResolvedValue(
        mockMatchExplanation,
      );

      const result = await controller.generateExplanation(generateDto);

      expect(result).toEqual({
        success: true,
        data: mockMatchExplanation,
        message: 'Match explanation generated successfully',
      });

      expect(applicationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'app-1' },
        relations: ['candidate', 'candidate.parsedData', 'companyJobVariant'],
      });

      expect(matchingService.matchCandidateToJob).toHaveBeenCalledWith(
        'candidate-1',
        'job-variant-1',
        { includeExplanation: true },
      );

      expect(
        matchExplanationService.generateMatchExplanation,
      ).toHaveBeenCalledWith(
        'app-1',
        mockMatchResult,
        mockCandidate,
        mockJobVariant,
        {
          includeDetailedAnalysis: true,
          includeRecommendations: true,
          maxExplanationLength: 2000,
        },
      );
    });

    it('should throw 404 if application not found', async () => {
      applicationRepository.findOne.mockResolvedValue(null);

      await expect(controller.generateExplanation(generateDto)).rejects.toThrow(
        new HttpException('Application app-1 not found', HttpStatus.NOT_FOUND),
      );
    });

    it('should throw 404 if job variant not found', async () => {
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      jobVariantRepository.findOne.mockResolvedValue(null);

      await expect(controller.generateExplanation(generateDto)).rejects.toThrow(
        new HttpException('Job variant not found', HttpStatus.NOT_FOUND),
      );
    });

    it('should handle service errors', async () => {
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      jobVariantRepository.findOne.mockResolvedValue(mockJobVariant);
      matchingService.matchCandidateToJob.mockRejectedValue(
        new Error('Matching service error'),
      );

      await expect(controller.generateExplanation(generateDto)).rejects.toThrow(
        new HttpException(
          'Failed to generate match explanation',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('getExplanationByApplication', () => {
    it('should return match explanation successfully', async () => {
      matchExplanationService.getMatchExplanation.mockResolvedValue(
        mockMatchExplanation,
      );

      const result = await controller.getExplanationByApplication('app-1');

      expect(result).toEqual({
        success: true,
        data: mockMatchExplanation,
      });

      expect(matchExplanationService.getMatchExplanation).toHaveBeenCalledWith(
        'app-1',
      );
    });

    it('should throw 404 if explanation not found', async () => {
      matchExplanationService.getMatchExplanation.mockResolvedValue(null);

      await expect(
        controller.getExplanationByApplication('app-1'),
      ).rejects.toThrow(
        new HttpException('Match explanation not found', HttpStatus.NOT_FOUND),
      );
    });

    it('should handle service errors', async () => {
      matchExplanationService.getMatchExplanation.mockRejectedValue(
        new Error('Service error'),
      );

      await expect(
        controller.getExplanationByApplication('app-1'),
      ).rejects.toThrow(
        new HttpException(
          'Failed to fetch match explanation',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('updateExplanation', () => {
    const updateDto = {
      includeDetailedAnalysis: true,
      includeRecommendations: false,
      maxExplanationLength: 1500,
    };

    it('should update match explanation successfully', async () => {
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      jobVariantRepository.findOne.mockResolvedValue(mockJobVariant);
      matchingService.matchCandidateToJob.mockResolvedValue(mockMatchResult);
      matchExplanationService.updateMatchExplanation.mockResolvedValue(
        mockMatchExplanation,
      );

      const result = await controller.updateExplanation('app-1', updateDto);

      expect(result).toEqual({
        success: true,
        data: mockMatchExplanation,
        message: 'Match explanation updated successfully',
      });

      expect(
        matchExplanationService.updateMatchExplanation,
      ).toHaveBeenCalledWith(
        'app-1',
        mockMatchResult,
        mockCandidate,
        mockJobVariant,
        {
          includeDetailedAnalysis: true,
          includeRecommendations: false,
          maxExplanationLength: 1500,
        },
      );
    });

    it('should throw 404 if application not found', async () => {
      applicationRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.updateExplanation('app-1', updateDto),
      ).rejects.toThrow(
        new HttpException('Application app-1 not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('deleteExplanation', () => {
    it('should delete match explanation successfully', async () => {
      matchExplanationService.getMatchExplanation.mockResolvedValue(
        mockMatchExplanation,
      );
      matchExplanationService.deleteMatchExplanation.mockResolvedValue();

      const result = await controller.deleteExplanation('app-1');

      expect(result).toEqual({
        success: true,
        message: 'Match explanation deleted successfully',
      });

      expect(
        matchExplanationService.deleteMatchExplanation,
      ).toHaveBeenCalledWith('app-1');
    });

    it('should throw 404 if explanation not found', async () => {
      matchExplanationService.getMatchExplanation.mockResolvedValue(null);

      await expect(controller.deleteExplanation('app-1')).rejects.toThrow(
        new HttpException('Match explanation not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('batchRegenerateExplanations', () => {
    const batchDto = {
      applicationIds: ['app-1', 'app-2'],
      options: {
        includeDetailedAnalysis: true,
        includeRecommendations: true,
      },
    };

    it('should batch regenerate explanations successfully', async () => {
      // Mock successful processing for both applications
      applicationRepository.findOne
        .mockResolvedValueOnce(mockApplication)
        .mockResolvedValueOnce({
          ...mockApplication,
          id: 'app-2',
          candidateId: 'candidate-2',
        });

      jobVariantRepository.findOne
        .mockResolvedValueOnce(mockJobVariant)
        .mockResolvedValueOnce(mockJobVariant);

      matchingService.matchCandidateToJob
        .mockResolvedValueOnce(mockMatchResult)
        .mockResolvedValueOnce({
          ...mockMatchResult,
          candidateId: 'candidate-2',
        });

      matchExplanationService.updateMatchExplanation
        .mockResolvedValueOnce(mockMatchExplanation)
        .mockResolvedValueOnce({
          ...mockMatchExplanation,
          id: 'explanation-2',
          applicationId: 'app-2',
        });

      const result = await controller.batchRegenerateExplanations(batchDto);

      expect(result.success).toBe(true);
      expect(result.data.successful).toHaveLength(2);
      expect(result.data.failed).toHaveLength(0);
      expect(result.data.summary.total).toBe(2);
      expect(result.data.summary.successful).toBe(2);
      expect(result.data.summary.failed).toBe(0);
    });

    it('should handle partial failures in batch processing', async () => {
      // First application succeeds, second fails
      applicationRepository.findOne
        .mockResolvedValueOnce(mockApplication)
        .mockResolvedValueOnce(null); // Application not found

      jobVariantRepository.findOne.mockResolvedValueOnce(mockJobVariant);

      matchingService.matchCandidateToJob.mockResolvedValueOnce(
        mockMatchResult,
      );

      matchExplanationService.updateMatchExplanation.mockResolvedValueOnce(
        mockMatchExplanation,
      );

      const result = await controller.batchRegenerateExplanations(batchDto);

      expect(result.success).toBe(true);
      expect(result.data.successful).toHaveLength(1);
      expect(result.data.failed).toHaveLength(1);
      expect(result.data.failed[0]).toEqual({
        applicationId: 'app-2',
        error: 'Application not found',
      });
    });

    it('should throw 400 for empty application IDs array', async () => {
      await expect(
        controller.batchRegenerateExplanations({
          applicationIds: [],
        }),
      ).rejects.toThrow(
        new HttpException(
          'Application IDs array is required',
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw 400 for too many applications', async () => {
      const tooManyIds = Array.from({ length: 51 }, (_, i) => `app-${i}`);

      await expect(
        controller.batchRegenerateExplanations({
          applicationIds: tooManyIds,
        }),
      ).rejects.toThrow(
        new HttpException(
          'Maximum 50 applications can be processed at once',
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const generateDto = {
        applicationId: 'app-1',
      };

      applicationRepository.findOne.mockRejectedValue(
        new Error('Unexpected database error'),
      );

      await expect(controller.generateExplanation(generateDto)).rejects.toThrow(
        new HttpException(
          'Failed to generate match explanation',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });

    it('should preserve HttpException errors', async () => {
      const generateDto = {
        applicationId: 'app-1',
      };

      const httpError = new HttpException(
        'Custom error',
        HttpStatus.BAD_REQUEST,
      );
      applicationRepository.findOne.mockRejectedValue(httpError);

      await expect(controller.generateExplanation(generateDto)).rejects.toThrow(
        httpError,
      );
    });
  });
});
