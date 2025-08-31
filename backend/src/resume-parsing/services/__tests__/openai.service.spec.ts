import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAIService } from '../openai.service';

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
};

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => mockOpenAI);
});

describe('OpenAIService', () => {
  let service: OpenAIService;
  let configService: ConfigService;

  const mockBuffer = Buffer.from('test file content');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAIService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'OPENAI_API_KEY':
                  return 'test-api-key';
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OpenAIService>(OpenAIService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if OpenAI API key is not configured', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(null),
      };

      expect(() => {
        new OpenAIService(mockConfigService as any);
      }).toThrow('OpenAI API key is not configured');
    });
  });

  describe('extractTextFromPDF', () => {
    it('should extract text from PDF successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Extracted PDF text content',
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.extractTextFromPDF(mockBuffer, 'test.pdf');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('text extraction specialist'),
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract all text from this PDF document:',
              },
              {
                type: 'image_url',
                image_url: {
                  url: expect.stringContaining('data:application/pdf;base64,'),
                },
              },
            ],
          },
        ],
        max_tokens: 4000,
        temperature: 0,
      });

      expect(result).toBe('Extracted PDF text content');
    });

    it('should handle OpenAI API errors with retry', async () => {
      const mockError = new Error('API Error');
      mockError['status'] = 500;

      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValue({
          choices: [{ message: { content: 'Success after retry' } }],
        });

      const result = await service.extractTextFromPDF(mockBuffer, 'test.pdf');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
      expect(result).toBe('Success after retry');
    });

    it('should handle rate limiting with exponential backoff', async () => {
      const mockError = new Error('Rate limited');
      mockError['status'] = 429;

      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(mockError)
        .mockResolvedValue({
          choices: [{ message: { content: 'Success after rate limit' } }],
        });

      const result = await service.extractTextFromPDF(mockBuffer, 'test.pdf');

      expect(result).toBe('Success after rate limit');
    });

    it('should throw error after max retries', async () => {
      const mockError = new Error('Persistent API Error');
      mockOpenAI.chat.completions.create.mockRejectedValue(mockError);

      await expect(
        service.extractTextFromPDF(mockBuffer, 'test.pdf'),
      ).rejects.toThrow(
        'Failed to extract text from PDF: Persistent API Error',
      );

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('extractTextFromDOCX', () => {
    it('should extract text from DOCX successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Extracted DOCX text content',
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.extractTextFromDOCX(mockBuffer, 'test.docx');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('text extraction specialist'),
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract all text from this DOCX document:',
              },
              {
                type: 'image_url',
                image_url: {
                  url: expect.stringContaining(
                    'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,',
                  ),
                },
              },
            ],
          },
        ],
        max_tokens: 4000,
        temperature: 0,
      });

      expect(result).toBe('Extracted DOCX text content');
    });
  });

  describe('extractTextFromImage', () => {
    it('should extract text from image successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Extracted image text content',
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      // Create a mock JPEG buffer (starts with FFD8)
      const jpegBuffer = Buffer.from([
        0xff,
        0xd8,
        0xff,
        0xe0,
        ...Array(100).fill(0),
      ]);

      const result = await service.extractTextFromImage(jpegBuffer, 'test.jpg');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('OCR specialist'),
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract all text from this image:',
              },
              {
                type: 'image_url',
                image_url: {
                  url: expect.stringContaining('data:image/jpeg;base64,'),
                },
              },
            ],
          },
        ],
        max_tokens: 4000,
        temperature: 0,
      });

      expect(result).toBe('Extracted image text content');
    });
  });

  describe('parseStructuredData', () => {
    it('should parse structured data successfully', async () => {
      const mockResumeData = {
        personalInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          location: 'New York, NY',
          linkedinUrl: 'https://linkedin.com/in/johndoe',
          portfolioUrl: 'https://johndoe.dev',
        },
        summary: 'Experienced software engineer',
        skills: ['JavaScript', 'TypeScript', 'React'],
        experience: [
          {
            company: 'Tech Corp',
            position: 'Senior Developer',
            startDate: '2020-01',
            endDate: '2023-12',
            description: 'Led development team',
            technologies: ['React', 'Node.js'],
          },
        ],
        education: [
          {
            institution: 'University of Technology',
            degree: 'Bachelor of Science',
            field: 'Computer Science',
            graduationYear: 2019,
            gpa: '3.8',
          },
        ],
        certifications: ['AWS Certified Developer'],
        totalExperience: 4,
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockResumeData),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const resumeText = 'Sample resume text content';
      const result = await service.parseStructuredData(resumeText);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a precise resume parsing assistant. Return only valid JSON with the extracted information.',
          },
          {
            role: 'user',
            content: expect.stringContaining(
              'You are a resume parsing specialist',
            ),
          },
        ],
        max_tokens: 3000,
        temperature: 0,
      });

      expect(result).toEqual(mockResumeData);
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Invalid JSON response',
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const resumeText = 'Sample resume text content';

      await expect(service.parseStructuredData(resumeText)).rejects.toThrow(
        'Failed to parse structured data: Invalid JSON response from OpenAI',
      );
    });

    it('should validate and clean parsed data', async () => {
      const mockIncompleteData = {
        personalInfo: {
          name: 'John Doe',
          // Missing other fields
        },
        skills: 'not an array', // Invalid type
        experience: [
          {
            company: 'Tech Corp',
            // Missing other required fields
          },
        ],
        // Missing other fields
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockIncompleteData),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const resumeText = 'Sample resume text content';
      const result = await service.parseStructuredData(resumeText);

      // Should have cleaned and validated the data
      expect(result.personalInfo.name).toBe('John Doe');
      expect(result.personalInfo.email).toBeNull();
      expect(result.skills).toEqual([]); // Should be empty array instead of invalid string
      expect(result.experience).toHaveLength(1);
      expect(result.experience[0].company).toBe('Tech Corp');
      expect(result.experience[0].position).toBe(''); // Should have default empty string
      expect(result.totalExperience).toBe(0); // Should have default value
    });
  });

  describe('getImageMimeType', () => {
    it('should detect JPEG images', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const result = service['getImageMimeType'](jpegBuffer);
      expect(result).toBe('image/jpeg');
    });

    it('should detect PNG images', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const result = service['getImageMimeType'](pngBuffer);
      expect(result).toBe('image/png');
    });

    it('should detect GIF images', () => {
      const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38]);
      const result = service['getImageMimeType'](gifBuffer);
      expect(result).toBe('image/gif');
    });

    it('should default to JPEG for unknown types', () => {
      const unknownBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      const result = service['getImageMimeType'](unknownBuffer);
      expect(result).toBe('image/jpeg');
    });

    it('should handle small buffers', () => {
      const smallBuffer = Buffer.from([0xff]);
      const result = service['getImageMimeType'](smallBuffer);
      expect(result).toBe('image/jpeg');
    });
  });
});
