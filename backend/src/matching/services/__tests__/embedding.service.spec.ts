import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from '../embedding.service';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let configService: ConfigService;
  let mockOpenAI: jest.Mocked<OpenAI>;

  const mockEmbeddingResponse = {
    data: [
      {
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        index: 0,
        object: 'embedding',
      },
    ],
    model: 'text-embedding-3-large',
    object: 'list',
    usage: {
      prompt_tokens: 10,
      total_tokens: 10,
    },
  };

  beforeEach(async () => {
    const mockEmbeddings = {
      create: jest.fn(),
    };

    mockOpenAI = {
      embeddings: mockEmbeddings,
    } as any;

    MockedOpenAI.mockImplementation(() => mockOpenAI);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-api-key'),
          },
        },
      ],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if OpenAI API key is not configured', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      expect(() => {
        new EmbeddingService(configService);
      }).toThrow('OpenAI API key is not configured');
    });

    it('should initialize OpenAI client with API key', () => {
      expect(MockedOpenAI).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
      });
    });
  });

  describe('generateCandidateEmbedding', () => {
    it('should generate embedding for candidate data', async () => {
      mockOpenAI.embeddings.create.mockResolvedValue(mockEmbeddingResponse);

      const skills = ['JavaScript', 'React', 'Node.js'];
      const experience = 'Software Engineer with 5 years experience';
      const summary = 'Experienced full-stack developer';

      const result = await service.generateCandidateEmbedding(
        skills,
        experience,
        summary,
      );

      expect(result).toEqual({
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        text: expect.stringContaining(
          'Summary: Experienced full-stack developer',
        ),
        tokenCount: 10,
      });

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-large',
        input: expect.stringContaining('Skills: JavaScript, React, Node.js'),
        encoding_format: 'float',
      });
    });

    it('should handle candidate data without summary', async () => {
      mockOpenAI.embeddings.create.mockResolvedValue(mockEmbeddingResponse);

      const skills = ['Python', 'Django'];
      const experience = 'Backend developer';

      const result = await service.generateCandidateEmbedding(
        skills,
        experience,
      );

      expect(result.text).not.toContain('Summary:');
      expect(result.text).toContain('Skills: Python, Django');
      expect(result.text).toContain('Experience: Backend developer');
    });

    it('should throw error on OpenAI API failure', async () => {
      mockOpenAI.embeddings.create.mockRejectedValue(new Error('API Error'));

      await expect(
        service.generateCandidateEmbedding(['JavaScript'], 'Developer'),
      ).rejects.toThrow('Failed to generate candidate embedding: API Error');
    });
  });

  describe('generateJobRequirementsEmbedding', () => {
    it('should generate embedding for job requirements', async () => {
      mockOpenAI.embeddings.create.mockResolvedValue(mockEmbeddingResponse);

      const requirements = [
        {
          description: 'JavaScript proficiency',
          type: 'skill',
          category: 'must',
          weight: 8,
        },
        {
          description: 'React experience',
          type: 'skill',
          category: 'should',
          weight: 6,
        },
        {
          description: 'AWS knowledge',
          type: 'skill',
          category: 'nice',
          weight: 4,
        },
      ];

      const result = await service.generateJobRequirementsEmbedding(
        requirements,
        'Senior Frontend Developer',
        'Build amazing user interfaces',
      );

      expect(result).toEqual({
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        text: expect.stringContaining('Job Title: Senior Frontend Developer'),
        tokenCount: 10,
      });

      expect(result.text).toContain(
        'Must Have Requirements: JavaScript proficiency',
      );
      expect(result.text).toContain(
        'Should Have Requirements: React experience',
      );
      expect(result.text).toContain('Nice to Have Requirements: AWS knowledge');
    });

    it('should handle requirements without job title and description', async () => {
      mockOpenAI.embeddings.create.mockResolvedValue(mockEmbeddingResponse);

      const requirements = [
        {
          description: 'Python programming',
          type: 'skill',
          category: 'must',
          weight: 9,
        },
      ];

      const result =
        await service.generateJobRequirementsEmbedding(requirements);

      expect(result.text).not.toContain('Job Title:');
      expect(result.text).not.toContain('Job Description:');
      expect(result.text).toContain(
        'Must Have Requirements: Python programming',
      );
    });
  });

  describe('generateSkillEmbedding', () => {
    it('should generate embedding for individual skill', async () => {
      mockOpenAI.embeddings.create.mockResolvedValue(mockEmbeddingResponse);

      const result = await service.generateSkillEmbedding('Machine Learning');

      expect(result).toEqual({
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        text: 'Machine Learning',
        tokenCount: 10,
      });

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-large',
        input: 'Machine Learning',
        encoding_format: 'float',
      });
    });
  });

  describe('generateBatchSkillEmbeddings', () => {
    it('should generate embeddings for multiple skills', async () => {
      mockOpenAI.embeddings.create.mockResolvedValue(mockEmbeddingResponse);

      const skills = ['JavaScript', 'Python', 'Java'];
      const results = await service.generateBatchSkillEmbeddings(skills);

      expect(results).toHaveLength(3);
      expect(results[0].text).toBe('JavaScript');
      expect(results[1].text).toBe('Python');
      expect(results[2].text).toBe('Java');

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(3);
    });

    it('should process large batches with delays', async () => {
      mockOpenAI.embeddings.create.mockResolvedValue(mockEmbeddingResponse);

      // Create array of 15 skills to test batching (batch size is 10)
      const skills = Array.from({ length: 15 }, (_, i) => `Skill${i + 1}`);

      const results = await service.generateBatchSkillEmbeddings(skills);

      expect(results).toHaveLength(15);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(15);
    });

    it('should handle empty skills array', async () => {
      const results = await service.generateBatchSkillEmbeddings([]);

      expect(results).toHaveLength(0);
      expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
    });
  });

  describe('retry mechanism', () => {
    it('should retry on rate limit error', async () => {
      const rateLimitError = new Error('Rate limited');
      (rateLimitError as any).status = 429;

      mockOpenAI.embeddings.create
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(mockEmbeddingResponse);

      const result = await service.generateSkillEmbedding('Test Skill');

      expect(result.embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(3);
    });

    it('should retry on general error', async () => {
      mockOpenAI.embeddings.create
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(mockEmbeddingResponse);

      const result = await service.generateSkillEmbedding('Test Skill');

      expect(result.embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      mockOpenAI.embeddings.create.mockRejectedValue(
        new Error('Persistent error'),
      );

      await expect(
        service.generateSkillEmbedding('Test Skill'),
      ).rejects.toThrow('Failed to generate skill embedding: Persistent error');

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('text truncation', () => {
    it('should truncate very long text', async () => {
      mockOpenAI.embeddings.create.mockResolvedValue(mockEmbeddingResponse);

      // Create a very long text (over 32,000 characters)
      const longText = 'A'.repeat(35000);
      const result = await service.generateSkillEmbedding(longText);

      expect(result.text.length).toBeLessThan(longText.length);
      expect(result.text.length).toBeLessThanOrEqual(8191 * 4); // Max tokens * 4 chars per token
    });

    it('should not truncate normal length text', async () => {
      mockOpenAI.embeddings.create.mockResolvedValue(mockEmbeddingResponse);

      const normalText = 'This is a normal length text for embedding';
      const result = await service.generateSkillEmbedding(normalText);

      expect(result.text).toBe(normalText);
    });
  });
});
