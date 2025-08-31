import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VectorStorageService } from '../vector-storage.service';
import { Candidate } from '../../../entities/candidate.entity';
import { RequirementItem } from '../../../entities/requirement-item.entity';
import { CompanyJobVariant } from '../../../entities/company-job-variant.entity';

describe('VectorStorageService', () => {
  let service: VectorStorageService;
  let candidateRepository: jest.Mocked<Repository<Candidate>>;
  let requirementRepository: jest.Mocked<Repository<RequirementItem>>;
  let jobVariantRepository: jest.Mocked<Repository<CompanyJobVariant>>;

  const mockCandidate: Partial<Candidate> = {
    id: 'candidate-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    skillEmbeddings: [0.1, 0.2, 0.3, 0.4, 0.5],
  };

  beforeEach(async () => {
    const mockCandidateRepository = {
      update: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockRequirementRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockJobVariantRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorStorageService,
        {
          provide: getRepositoryToken(Candidate),
          useValue: mockCandidateRepository,
        },
        {
          provide: getRepositoryToken(RequirementItem),
          useValue: mockRequirementRepository,
        },
        {
          provide: getRepositoryToken(CompanyJobVariant),
          useValue: mockJobVariantRepository,
        },
      ],
    }).compile();

    service = module.get<VectorStorageService>(VectorStorageService);
    candidateRepository = module.get(getRepositoryToken(Candidate));
    requirementRepository = module.get(getRepositoryToken(RequirementItem));
    jobVariantRepository = module.get(getRepositoryToken(CompanyJobVariant));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('storeCandidateEmbedding', () => {
    it('should store candidate embedding successfully', async () => {
      candidateRepository.update.mockResolvedValue({} as any);

      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      await service.storeCandidateEmbedding('candidate-1', embedding);

      expect(candidateRepository.update).toHaveBeenCalledWith('candidate-1', {
        skillEmbeddings: embedding,
      });
    });

    it('should throw error on database failure', async () => {
      candidateRepository.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.storeCandidateEmbedding('candidate-1', [0.1, 0.2]),
      ).rejects.toThrow('Failed to store candidate embedding: Database error');
    });
  });

  describe('calculateCosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const vectorA = [1, 0, 0];
      const vectorB = [0, 1, 0];

      const similarity = service.calculateCosineSimilarity(vectorA, vectorB);

      expect(similarity).toBe(0);
    });

    it('should return 1 for identical vectors', () => {
      const vectorA = [1, 2, 3];
      const vectorB = [1, 2, 3];

      const similarity = service.calculateCosineSimilarity(vectorA, vectorB);

      expect(similarity).toBe(1);
    });

    it('should return 0 for zero vectors', () => {
      const vectorA = [0, 0, 0];
      const vectorB = [1, 2, 3];

      const similarity = service.calculateCosineSimilarity(vectorA, vectorB);

      expect(similarity).toBe(0);
    });

    it('should throw error for vectors of different lengths', () => {
      const vectorA = [1, 2];
      const vectorB = [1, 2, 3];

      expect(() => {
        service.calculateCosineSimilarity(vectorA, vectorB);
      }).toThrow('Vectors must have the same length');
    });

    it('should calculate similarity for real embedding vectors', () => {
      const vectorA = [0.5, 0.3, 0.8, 0.1];
      const vectorB = [0.4, 0.2, 0.7, 0.2];

      const similarity = service.calculateCosineSimilarity(vectorA, vectorB);

      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('findSimilarCandidates', () => {
    it('should find similar candidates above threshold', async () => {
      const candidates = [
        {
          ...mockCandidate,
          id: 'candidate-1',
          skillEmbeddings: [0.9, 0.1, 0.0, 0.0, 0.0],
        },
        {
          ...mockCandidate,
          id: 'candidate-2',
          skillEmbeddings: [0.1, 0.9, 0.0, 0.0, 0.0],
        },
        {
          ...mockCandidate,
          id: 'candidate-3',
          skillEmbeddings: [0.8, 0.2, 0.0, 0.0, 0.0],
        },
      ];

      candidateRepository.find.mockResolvedValue(candidates as Candidate[]);

      const targetEmbedding = [1.0, 0.0, 0.0, 0.0, 0.0];
      const results = await service.findSimilarCandidates(targetEmbedding, {
        threshold: 0.7,
        limit: 5,
      });

      expect(results).toHaveLength(2); // candidate-1 and candidate-3 should be above threshold
      expect(results[0].id).toBe('candidate-1'); // Highest similarity first
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    });

    it('should handle candidates without embeddings', async () => {
      const candidates = [
        { ...mockCandidate, id: 'candidate-1', skillEmbeddings: null },
        { ...mockCandidate, id: 'candidate-2', skillEmbeddings: [] },
        {
          ...mockCandidate,
          id: 'candidate-3',
          skillEmbeddings: [0.9, 0.1, 0.0, 0.0, 0.0],
        },
      ];

      candidateRepository.find.mockResolvedValue(candidates as Candidate[]);

      const targetEmbedding = [1.0, 0.0, 0.0, 0.0, 0.0];
      const results = await service.findSimilarCandidates(targetEmbedding);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('candidate-3');
    });

    it('should limit results correctly', async () => {
      const candidates = Array.from({ length: 10 }, (_, i) => ({
        ...mockCandidate,
        id: `candidate-${i}`,
        skillEmbeddings: [0.8, 0.2, 0.0, 0.0, 0.0], // All similar
      }));

      candidateRepository.find.mockResolvedValue(candidates as Candidate[]);

      const targetEmbedding = [1.0, 0.0, 0.0, 0.0, 0.0];
      const results = await service.findSimilarCandidates(targetEmbedding, {
        limit: 3,
      });

      expect(results).toHaveLength(3);
    });

    it('should throw error on database failure', async () => {
      candidateRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(
        service.findSimilarCandidates([1.0, 0.0, 0.0]),
      ).rejects.toThrow('Failed to find similar candidates: Database error');
    });
  });

  describe('findCandidatesForJob', () => {
    it('should find candidates for job excluding those who already applied', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            ...mockCandidate,
            id: 'candidate-1',
            skillEmbeddings: [0.9, 0.1, 0.0, 0.0, 0.0],
          },
          {
            ...mockCandidate,
            id: 'candidate-2',
            skillEmbeddings: [0.8, 0.2, 0.0, 0.0, 0.0],
          },
        ]),
      };

      candidateRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const jobEmbedding = [1.0, 0.0, 0.0, 0.0, 0.0];
      const results = await service.findCandidatesForJob(
        jobEmbedding,
        'job-variant-1',
      );

      expect(results).toHaveLength(2);
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);

      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'candidate.applications',
        'application',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(application.companyJobVariantId != :jobVariantId OR application.companyJobVariantId IS NULL)',
        { jobVariantId: 'job-variant-1' },
      );
    });

    it('should filter by threshold', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            ...mockCandidate,
            id: 'candidate-1',
            skillEmbeddings: [0.9, 0.1, 0.0, 0.0, 0.0],
          },
          {
            ...mockCandidate,
            id: 'candidate-2',
            skillEmbeddings: [0.1, 0.9, 0.0, 0.0, 0.0],
          },
        ]),
      };

      candidateRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const jobEmbedding = [1.0, 0.0, 0.0, 0.0, 0.0];
      const results = await service.findCandidatesForJob(
        jobEmbedding,
        'job-variant-1',
        {
          threshold: 0.8,
        },
      );

      expect(results).toHaveLength(1); // Only candidate-1 should be above 0.8 threshold
      expect(results[0].id).toBe('candidate-1');
    });
  });

  describe('getCandidateWithEmbeddings', () => {
    it('should get candidate with embeddings and relations', async () => {
      candidateRepository.findOne.mockResolvedValue(mockCandidate as Candidate);

      const result = await service.getCandidateWithEmbeddings('candidate-1');

      expect(result).toEqual(mockCandidate);
      expect(candidateRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'candidate-1' },
        relations: ['parsedData'],
      });
    });

    it('should return null if candidate not found', async () => {
      candidateRepository.findOne.mockResolvedValue(null);

      const result = await service.getCandidateWithEmbeddings('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('hasCandidateEmbeddings', () => {
    it('should return true if candidate has embeddings', async () => {
      candidateRepository.findOne.mockResolvedValue({
        id: 'candidate-1',
        skillEmbeddings: [0.1, 0.2, 0.3],
      } as Candidate);

      const result = await service.hasCandidateEmbeddings('candidate-1');

      expect(result).toBe(true);
    });

    it('should return false if candidate has no embeddings', async () => {
      candidateRepository.findOne.mockResolvedValue({
        id: 'candidate-1',
        skillEmbeddings: null,
      } as Candidate);

      const result = await service.hasCandidateEmbeddings('candidate-1');

      expect(result).toBe(false);
    });

    it('should return false if candidate has empty embeddings', async () => {
      candidateRepository.findOne.mockResolvedValue({
        id: 'candidate-1',
        skillEmbeddings: [],
      } as Candidate);

      const result = await service.hasCandidateEmbeddings('candidate-1');

      expect(result).toBe(false);
    });

    it('should return false if candidate not found', async () => {
      candidateRepository.findOne.mockResolvedValue(null);

      const result = await service.hasCandidateEmbeddings('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      candidateRepository.findOne.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.hasCandidateEmbeddings('candidate-1');

      expect(result).toBe(false);
    });
  });

  describe('batchUpdateCandidateEmbeddings', () => {
    it('should batch update candidate embeddings', async () => {
      candidateRepository.update.mockResolvedValue({} as any);

      const updates = [
        { candidateId: 'candidate-1', embedding: [0.1, 0.2] },
        { candidateId: 'candidate-2', embedding: [0.3, 0.4] },
        { candidateId: 'candidate-3', embedding: [0.5, 0.6] },
      ];

      await service.batchUpdateCandidateEmbeddings(updates);

      expect(candidateRepository.update).toHaveBeenCalledTimes(3);
      expect(candidateRepository.update).toHaveBeenCalledWith('candidate-1', {
        skillEmbeddings: [0.1, 0.2],
      });
      expect(candidateRepository.update).toHaveBeenCalledWith('candidate-2', {
        skillEmbeddings: [0.3, 0.4],
      });
      expect(candidateRepository.update).toHaveBeenCalledWith('candidate-3', {
        skillEmbeddings: [0.5, 0.6],
      });
    });

    it('should process large batches in smaller chunks', async () => {
      candidateRepository.update.mockResolvedValue({} as any);

      // Create 25 updates to test batching (batch size is 10)
      const updates = Array.from({ length: 25 }, (_, i) => ({
        candidateId: `candidate-${i}`,
        embedding: [i * 0.1, i * 0.2],
      }));

      await service.batchUpdateCandidateEmbeddings(updates);

      expect(candidateRepository.update).toHaveBeenCalledTimes(25);
    });

    it('should handle empty updates array', async () => {
      await service.batchUpdateCandidateEmbeddings([]);

      expect(candidateRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('getEmbeddingStats', () => {
    it('should return embedding statistics', async () => {
      candidateRepository.count
        .mockResolvedValueOnce(100) // total candidates
        .mockResolvedValueOnce(75); // candidates with embeddings

      const stats = await service.getEmbeddingStats();

      expect(stats).toEqual({
        totalCandidates: 100,
        candidatesWithEmbeddings: 75,
        embeddingCoverage: 75,
      });
    });

    it('should handle zero candidates', async () => {
      candidateRepository.count
        .mockResolvedValueOnce(0) // total candidates
        .mockResolvedValueOnce(0); // candidates with embeddings

      const stats = await service.getEmbeddingStats();

      expect(stats).toEqual({
        totalCandidates: 0,
        candidatesWithEmbeddings: 0,
        embeddingCoverage: 0,
      });
    });

    it('should round coverage percentage', async () => {
      candidateRepository.count
        .mockResolvedValueOnce(3) // total candidates
        .mockResolvedValueOnce(2); // candidates with embeddings

      const stats = await service.getEmbeddingStats();

      expect(stats.embeddingCoverage).toBe(66.67); // 2/3 * 100 rounded to 2 decimal places
    });
  });
});
