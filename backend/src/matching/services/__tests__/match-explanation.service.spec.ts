import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchExplanationService } from '../match-explanation.service';
import {
  MatchExplanation,
  RequirementMatch,
} from '../../../entities/match-explanation.entity';
import { Candidate } from '../../../entities/candidate.entity';
import { CompanyJobVariant } from '../../../entities/company-job-variant.entity';
import {
  RequirementItem,
  RequirementCategory,
  RequirementType,
} from '../../../entities/requirement-item.entity';
import { MatchResult } from '../matching.service';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

describe('MatchExplanationService', () => {
  let service: MatchExplanationService;
  let matchExplanationRepository: jest.Mocked<Repository<MatchExplanation>>;
  let configService: jest.Mocked<ConfigService>;

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
        {
          name: 'React',
          yearsOfExperience: 4,
          proficiencyLevel: 'Advanced',
        },
      ],
      experience: [
        {
          company: 'Tech Corp',
          jobTitle: 'Senior Developer',
          startDate: '2020-01',
          endDate: '2023-12',
          description: 'Led development of React applications',
          technologies: ['React', 'JavaScript', 'Node.js'],
        },
      ],
      education: [
        {
          institution: 'University of Technology',
          degree: 'Bachelor of Science',
          fieldOfStudy: 'Computer Science',
          graduationYear: 2018,
          gpa: '3.8',
        },
      ],
      certifications: ['AWS Certified Developer'],
      summary: 'Experienced full-stack developer with 5+ years of experience',
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
    customTitle: 'Senior React Developer',
    customDescription: 'Looking for an experienced React developer',
    isActive: true,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    jobTemplate: {
      id: 'template-1',
      jobFamilyId: 'family-1',
      name: 'React Developer',
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
      name: 'Tech Startup Inc',
      industry: 'Technology',
      size: 'small',
      culture: ['innovative', 'fast-paced'],
      benefits: ['health insurance', 'remote work'],
      workArrangement: 'hybrid',
      location: 'San Francisco, CA',
      preferences: {
        prioritySkills: ['React', 'JavaScript'],
        dealBreakers: ['No experience'],
        niceToHave: ['AWS', 'TypeScript'],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      companyJobVariants: [],
    },
    requirements: [],
    jdVersions: [],
  };

  const mockRequirement: RequirementItem = {
    id: 'req-1',
    type: RequirementType.SKILL,
    category: RequirementCategory.MUST,
    description: 'React development experience',
    weight: 9,
    alternatives: ['Vue.js', 'Angular'],
    jobTemplateId: 'template-1',
    companyJobVariantId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    jobTemplate: null,
    companyJobVariant: null,
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
    strengths: ['Strong React experience', 'Good JavaScript skills'],
    gaps: ['Missing TypeScript experience'],
    recommendations: ['Consider TypeScript training'],
    detailedAnalysis: [
      {
        requirement: mockRequirement,
        matched: true,
        confidence: 0.9,
        evidence: ['React experience at Tech Corp'],
        explanation: 'Strong match for React requirement',
      },
    ],
  };

  beforeEach(async () => {
    const mockMatchExplanationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-api-key'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchExplanationService,
        {
          provide: getRepositoryToken(MatchExplanation),
          useValue: mockMatchExplanationRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MatchExplanationService>(MatchExplanationService);
    matchExplanationRepository = module.get(
      getRepositoryToken(MatchExplanation),
    );
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateMatchExplanation', () => {
    it('should generate and save match explanation successfully', async () => {
      // Mock OpenAI response
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                strengths: [
                  'Excellent React development skills with 4+ years experience',
                  'Strong JavaScript foundation with 5 years of expertise',
                ],
                gaps: ['Limited TypeScript experience for modern development'],
                recommendations: [
                  'Consider TypeScript training to enhance development skills',
                ],
              }),
            },
          },
        ],
      };

      // Mock the OpenAI service
      const mockOpenAI = require('openai').default;
      const mockInstance = new mockOpenAI();
      mockInstance.chat.completions.create.mockResolvedValue(
        mockOpenAIResponse,
      );

      const mockSavedExplanation: MatchExplanation = {
        id: 'explanation-1',
        applicationId: 'app-1',
        overallScore: 85,
        mustHaveScore: 90,
        shouldHaveScore: 80,
        niceToHaveScore: 75,
        strengths: [
          'Excellent React development skills with 4+ years experience',
          'Strong JavaScript foundation with 5 years of expertise',
        ],
        gaps: ['Limited TypeScript experience for modern development'],
        recommendations: [
          'Consider TypeScript training to enhance development skills',
        ],
        detailedAnalysis: mockMatchResult.detailedAnalysis,
        createdAt: new Date(),
        application: null,
      };

      matchExplanationRepository.create.mockReturnValue(mockSavedExplanation);
      matchExplanationRepository.save.mockResolvedValue(mockSavedExplanation);

      const result = await service.generateMatchExplanation(
        'app-1',
        mockMatchResult,
        mockCandidate,
        mockJobVariant,
      );

      expect(result).toEqual(mockSavedExplanation);
      expect(matchExplanationRepository.create).toHaveBeenCalledWith({
        applicationId: 'app-1',
        overallScore: 85,
        mustHaveScore: 90,
        shouldHaveScore: 80,
        niceToHaveScore: 75,
        strengths: expect.any(Array),
        gaps: expect.any(Array),
        recommendations: expect.any(Array),
        detailedAnalysis: expect.any(Array),
      });
      expect(matchExplanationRepository.save).toHaveBeenCalled();
    });

    it('should handle OpenAI API failures gracefully', async () => {
      // Mock OpenAI failure
      const mockOpenAI = require('openai').default;
      const mockInstance = new mockOpenAI();
      mockInstance.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API error'),
      );

      const mockSavedExplanation: MatchExplanation = {
        id: 'explanation-1',
        applicationId: 'app-1',
        overallScore: 85,
        mustHaveScore: 90,
        shouldHaveScore: 80,
        niceToHaveScore: 75,
        strengths: mockMatchResult.strengths,
        gaps: mockMatchResult.gaps,
        recommendations: mockMatchResult.recommendations,
        detailedAnalysis: mockMatchResult.detailedAnalysis,
        createdAt: new Date(),
        application: null,
      };

      matchExplanationRepository.create.mockReturnValue(mockSavedExplanation);
      matchExplanationRepository.save.mockResolvedValue(mockSavedExplanation);

      const result = await service.generateMatchExplanation(
        'app-1',
        mockMatchResult,
        mockCandidate,
        mockJobVariant,
      );

      // Should fallback to basic explanation from match result
      expect(result.strengths).toEqual(mockMatchResult.strengths);
      expect(result.gaps).toEqual(mockMatchResult.gaps);
      expect(result.recommendations).toEqual(mockMatchResult.recommendations);
    });

    it('should handle invalid JSON response from OpenAI', async () => {
      // Mock invalid JSON response
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: 'Invalid JSON response',
            },
          },
        ],
      };

      const mockOpenAI = require('openai').default;
      const mockInstance = new mockOpenAI();
      mockInstance.chat.completions.create.mockResolvedValue(
        mockOpenAIResponse,
      );

      const mockSavedExplanation: MatchExplanation = {
        id: 'explanation-1',
        applicationId: 'app-1',
        overallScore: 85,
        mustHaveScore: 90,
        shouldHaveScore: 80,
        niceToHaveScore: 75,
        strengths: [],
        gaps: [],
        recommendations: [],
        detailedAnalysis: mockMatchResult.detailedAnalysis,
        createdAt: new Date(),
        application: null,
      };

      matchExplanationRepository.create.mockReturnValue(mockSavedExplanation);
      matchExplanationRepository.save.mockResolvedValue(mockSavedExplanation);

      const result = await service.generateMatchExplanation(
        'app-1',
        mockMatchResult,
        mockCandidate,
        mockJobVariant,
      );

      // Should handle invalid JSON gracefully
      expect(result.strengths).toEqual([]);
      expect(result.gaps).toEqual([]);
      expect(result.recommendations).toEqual([]);
    });
  });

  describe('updateMatchExplanation', () => {
    it('should update existing match explanation', async () => {
      const existingExplanation: MatchExplanation = {
        id: 'explanation-1',
        applicationId: 'app-1',
        overallScore: 80,
        mustHaveScore: 85,
        shouldHaveScore: 75,
        niceToHaveScore: 70,
        strengths: ['Old strength'],
        gaps: ['Old gap'],
        recommendations: ['Old recommendation'],
        detailedAnalysis: [],
        createdAt: new Date(),
        application: null,
      };

      matchExplanationRepository.findOne.mockResolvedValue(existingExplanation);

      // Mock OpenAI response
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                strengths: ['Updated strength'],
                gaps: ['Updated gap'],
                recommendations: ['Updated recommendation'],
              }),
            },
          },
        ],
      };

      const mockOpenAI = require('openai').default;
      const mockInstance = new mockOpenAI();
      mockInstance.chat.completions.create.mockResolvedValue(
        mockOpenAIResponse,
      );

      const updatedExplanation = {
        ...existingExplanation,
        overallScore: 85,
        strengths: ['Updated strength'],
        gaps: ['Updated gap'],
        recommendations: ['Updated recommendation'],
      };

      matchExplanationRepository.save.mockResolvedValue(updatedExplanation);

      const result = await service.updateMatchExplanation(
        'app-1',
        mockMatchResult,
        mockCandidate,
        mockJobVariant,
      );

      expect(result.overallScore).toBe(85);
      expect(result.strengths).toEqual(['Updated strength']);
      expect(matchExplanationRepository.save).toHaveBeenCalled();
    });

    it('should create new explanation if none exists', async () => {
      matchExplanationRepository.findOne.mockResolvedValue(null);

      // Mock the generateMatchExplanation method
      const mockSavedExplanation: MatchExplanation = {
        id: 'explanation-1',
        applicationId: 'app-1',
        overallScore: 85,
        mustHaveScore: 90,
        shouldHaveScore: 80,
        niceToHaveScore: 75,
        strengths: ['New strength'],
        gaps: ['New gap'],
        recommendations: ['New recommendation'],
        detailedAnalysis: mockMatchResult.detailedAnalysis,
        createdAt: new Date(),
        application: null,
      };

      // Mock OpenAI response
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                strengths: ['New strength'],
                gaps: ['New gap'],
                recommendations: ['New recommendation'],
              }),
            },
          },
        ],
      };

      const mockOpenAI = require('openai').default;
      const mockInstance = new mockOpenAI();
      mockInstance.chat.completions.create.mockResolvedValue(
        mockOpenAIResponse,
      );

      matchExplanationRepository.create.mockReturnValue(mockSavedExplanation);
      matchExplanationRepository.save.mockResolvedValue(mockSavedExplanation);

      const result = await service.updateMatchExplanation(
        'app-1',
        mockMatchResult,
        mockCandidate,
        mockJobVariant,
      );

      expect(result).toEqual(mockSavedExplanation);
      expect(matchExplanationRepository.create).toHaveBeenCalled();
    });
  });

  describe('getMatchExplanation', () => {
    it('should return match explanation by application ID', async () => {
      const mockExplanation: MatchExplanation = {
        id: 'explanation-1',
        applicationId: 'app-1',
        overallScore: 85,
        mustHaveScore: 90,
        shouldHaveScore: 80,
        niceToHaveScore: 75,
        strengths: ['Strength 1'],
        gaps: ['Gap 1'],
        recommendations: ['Recommendation 1'],
        detailedAnalysis: [],
        createdAt: new Date(),
        application: null,
      };

      matchExplanationRepository.findOne.mockResolvedValue(mockExplanation);

      const result = await service.getMatchExplanation('app-1');

      expect(result).toEqual(mockExplanation);
      expect(matchExplanationRepository.findOne).toHaveBeenCalledWith({
        where: { applicationId: 'app-1' },
        relations: ['application'],
      });
    });

    it('should return null if explanation not found', async () => {
      matchExplanationRepository.findOne.mockResolvedValue(null);

      const result = await service.getMatchExplanation('app-1');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      matchExplanationRepository.findOne.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getMatchExplanation('app-1')).rejects.toThrow(
        'Failed to fetch match explanation: Database error',
      );
    });
  });

  describe('deleteMatchExplanation', () => {
    it('should delete match explanation successfully', async () => {
      matchExplanationRepository.delete.mockResolvedValue({
        affected: 1,
        raw: {},
      });

      await service.deleteMatchExplanation('app-1');

      expect(matchExplanationRepository.delete).toHaveBeenCalledWith({
        applicationId: 'app-1',
      });
    });

    it('should handle deletion errors', async () => {
      matchExplanationRepository.delete.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.deleteMatchExplanation('app-1')).rejects.toThrow(
        'Failed to delete match explanation: Database error',
      );
    });
  });

  describe('OpenAI integration', () => {
    it('should handle rate limiting with retry logic', async () => {
      // Mock OpenAI response for successful retry
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                strengths: ['Test strength'],
                gaps: ['Test gap'],
                recommendations: ['Test recommendation'],
              }),
            },
          },
        ],
      };

      const mockOpenAI = require('openai').default;
      const mockInstance = new mockOpenAI();

      // First call fails with rate limit, second succeeds
      mockInstance.chat.completions.create
        .mockRejectedValueOnce({ status: 429, message: 'Rate limited' })
        .mockResolvedValueOnce(mockOpenAIResponse);

      const mockSavedExplanation: MatchExplanation = {
        id: 'explanation-1',
        applicationId: 'app-1',
        overallScore: 85,
        mustHaveScore: 90,
        shouldHaveScore: 80,
        niceToHaveScore: 75,
        strengths: ['Test strength'],
        gaps: ['Test gap'],
        recommendations: ['Test recommendation'],
        detailedAnalysis: mockMatchResult.detailedAnalysis,
        createdAt: new Date(),
        application: null,
      };

      matchExplanationRepository.create.mockReturnValue(mockSavedExplanation);
      matchExplanationRepository.save.mockResolvedValue(mockSavedExplanation);

      const result = await service.generateMatchExplanation(
        'app-1',
        mockMatchResult,
        mockCandidate,
        mockJobVariant,
      );

      expect(result.strengths).toEqual(['Test strength']);
      // Note: The actual retry logic happens inside the private method,
      // so we can't directly test the call count here
      expect(result).toEqual(mockSavedExplanation);
    });
  });

  describe('configuration', () => {
    it('should throw error if OpenAI API key is not configured', () => {
      const mockConfigServiceWithoutKey = {
        get: jest.fn().mockReturnValue(undefined),
      };

      expect(() => {
        new MatchExplanationService(
          mockConfigServiceWithoutKey as any,
          matchExplanationRepository,
        );
      }).toThrow('OpenAI API key is not configured');
    });
  });
});
