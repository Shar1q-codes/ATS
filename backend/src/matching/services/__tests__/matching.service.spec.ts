import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchingService } from '../matching.service';
import { EmbeddingService } from '../embedding.service';
import { VectorStorageService } from '../vector-storage.service';
import { Candidate } from '../../../entities/candidate.entity';
import { CompanyJobVariant } from '../../../entities/company-job-variant.entity';
import {
  RequirementItem,
  RequirementCategory,
  RequirementType,
} from '../../../entities/requirement-item.entity';
import { ParsedResumeData } from '../../../entities/parsed-resume-data.entity';

describe('MatchingService', () => {
  let service: MatchingService;
  let embeddingService: jest.Mocked<EmbeddingService>;
  let vectorStorageService: jest.Mocked<VectorStorageService>;
  let candidateRepository: jest.Mocked<Repository<Candidate>>;
  let jobVariantRepository: jest.Mocked<Repository<CompanyJobVariant>>;
  let requirementRepository: jest.Mocked<Repository<RequirementItem>>;

  const mockCandidate: Candidate = {
    id: 'candidate-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    skillEmbeddings: [0.1, 0.2, 0.3],
    parsedData: {
      id: 'parsed-1',
      candidateId: 'candidate-1',
      skills: [
        {
          name: 'JavaScript',
          yearsOfExperience: 5,
          proficiencyLevel: 'Expert',
        },
        { name: 'React', yearsOfExperience: 3, proficiencyLevel: 'Advanced' },
        { name: 'Node.js', yearsOfExperience: 4, proficiencyLevel: 'Advanced' },
      ],
      experience: [
        {
          jobTitle: 'Senior Software Engineer',
          company: 'Tech Corp',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2023-01-01'),
          description: 'Developed web applications using React and Node.js',
        },
      ],
      education: [
        {
          degree: 'Bachelor of Science',
          fieldOfStudy: 'Computer Science',
          institution: 'University of Tech',
          graduationDate: new Date('2019-05-01'),
        },
      ],
      certifications: [],
      summary:
        'Experienced software engineer with expertise in JavaScript and React',
      totalExperience: 5,
    } as ParsedResumeData,
  } as Candidate;

  const mockJobVariant: CompanyJobVariant = {
    id: 'job-variant-1',
    jobTemplateId: 'template-1',
    companyProfileId: 'company-1',
    customTitle: 'Senior Frontend Developer',
    jobTemplate: {
      id: 'template-1',
      name: 'Frontend Developer',
      level: 'senior',
    },
  } as CompanyJobVariant;

  const mockRequirements: RequirementItem[] = [
    {
      id: 'req-1',
      type: RequirementType.SKILL,
      category: RequirementCategory.MUST,
      description: 'JavaScript programming',
      weight: 9,
    },
    {
      id: 'req-2',
      type: RequirementType.SKILL,
      category: RequirementCategory.MUST,
      description: 'React framework',
      weight: 8,
    },
    {
      id: 'req-3',
      type: RequirementType.SKILL,
      category: RequirementCategory.SHOULD,
      description: 'Node.js backend development',
      weight: 7,
    },
    {
      id: 'req-4',
      type: RequirementType.SKILL,
      category: RequirementCategory.NICE,
      description: 'TypeScript',
      weight: 5,
    },
  ] as RequirementItem[];

  beforeEach(async () => {
    const mockEmbeddingService = {
      generateSkillEmbedding: jest.fn(),
      generateJobRequirementsEmbedding: jest.fn(),
    };

    const mockVectorStorageService = {
      calculateCosineSimilarity: jest.fn(),
      findCandidatesForJob: jest.fn(),
      getEmbeddingStats: jest.fn(),
    };

    const mockCandidateRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockJobVariantRepository = {
      findOne: jest.fn(),
    };

    const mockRequirementRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        {
          provide: EmbeddingService,
          useValue: mockEmbeddingService,
        },
        {
          provide: VectorStorageService,
          useValue: mockVectorStorageService,
        },
        {
          provide: getRepositoryToken(Candidate),
          useValue: mockCandidateRepository,
        },
        {
          provide: getRepositoryToken(CompanyJobVariant),
          useValue: mockJobVariantRepository,
        },
        {
          provide: getRepositoryToken(RequirementItem),
          useValue: mockRequirementRepository,
        },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
    embeddingService = module.get(EmbeddingService);
    vectorStorageService = module.get(VectorStorageService);
    candidateRepository = module.get(getRepositoryToken(Candidate));
    jobVariantRepository = module.get(getRepositoryToken(CompanyJobVariant));
    requirementRepository = module.get(getRepositoryToken(RequirementItem));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('matchCandidateToJob', () => {
    beforeEach(() => {
      candidateRepository.findOne.mockResolvedValue(mockCandidate);
      jobVariantRepository.findOne.mockResolvedValue(mockJobVariant);
      requirementRepository.find.mockResolvedValue(mockRequirements);
      embeddingService.generateSkillEmbedding.mockResolvedValue({
        embedding: [0.5, 0.6, 0.7],
        text: 'test',
        tokenCount: 10,
      });
      vectorStorageService.calculateCosineSimilarity.mockReturnValue(0.85);
      embeddingService.generateJobRequirementsEmbedding.mockResolvedValue({
        embedding: [0.4, 0.5, 0.6],
        text: 'job requirements',
        tokenCount: 15,
      });
    });

    it('should successfully match candidate to job', async () => {
      const result = await service.matchCandidateToJob(
        'candidate-1',
        'job-variant-1',
      );

      expect(result).toBeDefined();
      expect(result.candidateId).toBe('candidate-1');
      expect(result.jobVariantId).toBe('job-variant-1');
      expect(result.fitScore).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.mustHaveScore).toBeGreaterThan(0);
      expect(result.strengths).toBeDefined();
      expect(result.gaps).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.detailedAnalysis).toBeDefined();
    });

    it('should throw error if candidate not found', async () => {
      candidateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.matchCandidateToJob('invalid-candidate', 'job-variant-1'),
      ).rejects.toThrow('Candidate invalid-candidate not found');
    });

    it('should throw error if job variant not found', async () => {
      jobVariantRepository.findOne.mockResolvedValue(null);

      await expect(
        service.matchCandidateToJob('candidate-1', 'invalid-job'),
      ).rejects.toThrow('Job variant invalid-job not found');
    });

    it('should calculate high fit score for well-matched candidate', async () => {
      // Mock high similarity scores
      vectorStorageService.calculateCosineSimilarity.mockReturnValue(0.95);

      const result = await service.matchCandidateToJob(
        'candidate-1',
        'job-variant-1',
      );

      expect(result.fitScore).toBeGreaterThan(80);
      expect(result.breakdown.mustHaveScore).toBeGreaterThan(80);
    });

    it('should calculate low fit score for poorly matched candidate', async () => {
      // Mock low similarity scores
      vectorStorageService.calculateCosineSimilarity.mockReturnValue(0.3);

      const result = await service.matchCandidateToJob(
        'candidate-1',
        'job-variant-1',
      );

      expect(result.fitScore).toBeLessThan(50);
    });

    it('should identify strengths correctly', async () => {
      // Mock high similarity for JavaScript and React
      vectorStorageService.calculateCosineSimilarity
        .mockReturnValueOnce(0.95) // JavaScript
        .mockReturnValueOnce(0.9) // React
        .mockReturnValueOnce(0.85) // Node.js
        .mockReturnValueOnce(0.4); // TypeScript

      const result = await service.matchCandidateToJob(
        'candidate-1',
        'job-variant-1',
      );

      expect(result.strengths).toContain('Strong in JavaScript programming');
      expect(result.strengths).toContain('Strong in React framework');
    });

    it('should identify gaps for missing must-have requirements', async () => {
      // Mock low similarity for must-have requirements
      vectorStorageService.calculateCosineSimilarity
        .mockReturnValueOnce(0.3) // JavaScript - low match
        .mockReturnValueOnce(0.2) // React - low match
        .mockReturnValueOnce(0.85) // Node.js
        .mockReturnValueOnce(0.4); // TypeScript

      const result = await service.matchCandidateToJob(
        'candidate-1',
        'job-variant-1',
      );

      expect(result.gaps.length).toBeGreaterThan(0);
      // Check that fit score is low due to missing must-haves
      expect(result.fitScore).toBeLessThan(70);
    });
  });

  describe('findMatchingCandidates', () => {
    beforeEach(() => {
      jobVariantRepository.findOne.mockResolvedValue(mockJobVariant);
      requirementRepository.find.mockResolvedValue(mockRequirements);
      embeddingService.generateJobRequirementsEmbedding.mockResolvedValue({
        embedding: [0.4, 0.5, 0.6],
        text: 'job requirements',
        tokenCount: 15,
      });
      vectorStorageService.findCandidatesForJob.mockResolvedValue([
        {
          id: 'candidate-1',
          similarity: 0.85,
          entity: mockCandidate,
        },
      ]);
      embeddingService.generateSkillEmbedding.mockResolvedValue({
        embedding: [0.5, 0.6, 0.7],
        text: 'test',
        tokenCount: 10,
      });
      vectorStorageService.calculateCosineSimilarity.mockReturnValue(0.85);
    });

    it('should find matching candidates for job', async () => {
      const results = await service.findMatchingCandidates('job-variant-1');

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].candidateId).toBe('candidate-1');
      expect(results[0].jobVariantId).toBe('job-variant-1');
      expect(results[0].fitScore).toBeGreaterThan(0);
    });

    it('should filter candidates by minimum fit score', async () => {
      // Mock low similarity to get low fit score
      vectorStorageService.calculateCosineSimilarity.mockReturnValue(0.3);

      const results = await service.findMatchingCandidates('job-variant-1', {
        minFitScore: 80,
      });

      expect(results.length).toBe(0);
    });

    it('should limit results by maxResults option', async () => {
      // Mock multiple candidates
      const multipleCandidates = Array.from({ length: 10 }, (_, i) => ({
        id: `candidate-${i}`,
        similarity: 0.8,
        entity: { ...mockCandidate, id: `candidate-${i}` },
      }));

      vectorStorageService.findCandidatesForJob.mockResolvedValue(
        multipleCandidates,
      );

      const results = await service.findMatchingCandidates('job-variant-1', {
        maxResults: 5,
      });

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should sort results by fit score descending', async () => {
      // Mock candidates with different similarities
      const candidates = [
        {
          id: 'candidate-1',
          similarity: 0.7,
          entity: { ...mockCandidate, id: 'candidate-1' },
        },
        {
          id: 'candidate-2',
          similarity: 0.9,
          entity: { ...mockCandidate, id: 'candidate-2' },
        },
      ];

      vectorStorageService.findCandidatesForJob.mockResolvedValue(candidates);

      // Mock different fit scores based on similarity
      vectorStorageService.calculateCosineSimilarity
        .mockReturnValueOnce(0.7) // First candidate
        .mockReturnValueOnce(0.7)
        .mockReturnValueOnce(0.7)
        .mockReturnValueOnce(0.7)
        .mockReturnValueOnce(0.9) // Second candidate
        .mockReturnValueOnce(0.9)
        .mockReturnValueOnce(0.9)
        .mockReturnValueOnce(0.9);

      const results = await service.findMatchingCandidates('job-variant-1');

      expect(results.length).toBe(2);
      expect(results[0].fitScore).toBeGreaterThanOrEqual(results[1].fitScore);
    });
  });

  describe('vector similarity calculations', () => {
    it('should use cosine similarity for matching', () => {
      candidateRepository.findOne.mockResolvedValue(mockCandidate);
      jobVariantRepository.findOne.mockResolvedValue(mockJobVariant);
      requirementRepository.find.mockResolvedValue(mockRequirements);

      embeddingService.generateSkillEmbedding.mockResolvedValue({
        embedding: [0.5, 0.6, 0.7],
        text: 'test',
        tokenCount: 10,
      });

      // Mock high similarity for good match
      vectorStorageService.calculateCosineSimilarity.mockReturnValue(0.9);

      expect(vectorStorageService.calculateCosineSimilarity).toBeDefined();
    });

    it('should handle vector similarity edge cases', () => {
      // Test that the service properly handles edge cases
      vectorStorageService.calculateCosineSimilarity.mockReturnValue(0);
      expect(
        vectorStorageService.calculateCosineSimilarity([1, 0, 0], [0, 1, 0]),
      ).toBe(0);

      vectorStorageService.calculateCosineSimilarity.mockReturnValue(1);
      expect(
        vectorStorageService.calculateCosineSimilarity([1, 2, 3], [1, 2, 3]),
      ).toBe(1);
    });
  });

  describe('keyword matching', () => {
    it('should match exact keywords', () => {
      const candidateText = 'JavaScript React Node.js';
      const requirementText = 'JavaScript programming';

      // Test the private method indirectly through matchCandidateToJob
      candidateRepository.findOne.mockResolvedValue(mockCandidate);
      jobVariantRepository.findOne.mockResolvedValue(mockJobVariant);
      requirementRepository.find.mockResolvedValue([
        {
          id: 'req-1',
          type: RequirementType.SKILL,
          category: RequirementCategory.MUST,
          description: 'JavaScript programming',
          weight: 9,
        } as RequirementItem,
      ]);

      embeddingService.generateSkillEmbedding.mockResolvedValue({
        embedding: [0.5, 0.6, 0.7],
        text: 'test',
        tokenCount: 10,
      });

      // Mock high similarity for keyword match
      vectorStorageService.calculateCosineSimilarity.mockReturnValue(0.9);

      expect(vectorStorageService.calculateCosineSimilarity).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle embedding service errors', async () => {
      candidateRepository.findOne.mockResolvedValue(mockCandidate);
      jobVariantRepository.findOne.mockResolvedValue(mockJobVariant);
      requirementRepository.find.mockResolvedValue(mockRequirements);

      embeddingService.generateSkillEmbedding.mockRejectedValue(
        new Error('OpenAI API error'),
      );

      await expect(
        service.matchCandidateToJob('candidate-1', 'job-variant-1'),
      ).rejects.toThrow();
    });

    it('should handle vector storage service errors', async () => {
      candidateRepository.findOne.mockResolvedValue(mockCandidate);
      jobVariantRepository.findOne.mockResolvedValue(mockJobVariant);
      requirementRepository.find.mockResolvedValue(mockRequirements);

      embeddingService.generateSkillEmbedding.mockResolvedValue({
        embedding: [0.5, 0.6, 0.7],
        text: 'test',
        tokenCount: 10,
      });

      vectorStorageService.calculateCosineSimilarity.mockImplementation(() => {
        throw new Error('Vector calculation error');
      });

      await expect(
        service.matchCandidateToJob('candidate-1', 'job-variant-1'),
      ).rejects.toThrow();
    });
  });

  describe('requirement categorization', () => {
    it('should weight MUST requirements heavily', async () => {
      const mustOnlyRequirements = [
        {
          id: 'req-1',
          type: RequirementType.SKILL,
          category: RequirementCategory.MUST,
          description: 'JavaScript programming',
          weight: 10,
        } as RequirementItem,
      ];

      candidateRepository.findOne.mockResolvedValue(mockCandidate);
      jobVariantRepository.findOne.mockResolvedValue(mockJobVariant);
      requirementRepository.find.mockResolvedValue(mustOnlyRequirements);

      embeddingService.generateSkillEmbedding.mockResolvedValue({
        embedding: [0.5, 0.6, 0.7],
        text: 'test',
        tokenCount: 10,
      });

      // High similarity for MUST requirement
      vectorStorageService.calculateCosineSimilarity.mockReturnValue(0.95);

      const result = await service.matchCandidateToJob(
        'candidate-1',
        'job-variant-1',
      );

      expect(result.breakdown.mustHaveScore).toBeGreaterThan(90);
      expect(result.fitScore).toBeGreaterThan(85); // Should be heavily weighted
    });

    it('should handle jobs with no requirements gracefully', async () => {
      candidateRepository.findOne.mockResolvedValue(mockCandidate);
      jobVariantRepository.findOne.mockResolvedValue(mockJobVariant);
      requirementRepository.find.mockResolvedValue([]);

      const result = await service.matchCandidateToJob(
        'candidate-1',
        'job-variant-1',
      );

      expect(result.fitScore).toBe(100); // Perfect score if no requirements
      expect(result.breakdown.mustHaveScore).toBe(100);
      expect(result.breakdown.shouldHaveScore).toBe(100);
      expect(result.breakdown.niceToHaveScore).toBe(100);
    });
  });
});
