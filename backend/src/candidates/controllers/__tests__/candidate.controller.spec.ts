import { Test, TestingModule } from '@nestjs/testing';
import { CandidateController } from '../candidate.controller';
import { CandidateService } from '../../services/candidate.service';
import { CreateCandidateDto } from '../../dto/create-candidate.dto';
import { UpdateCandidateDto } from '../../dto/update-candidate.dto';
import { CandidateResponseDto } from '../../dto/candidate-response.dto';

describe('CandidateController', () => {
  let controller: CandidateController;
  let service: CandidateService;

  const mockCandidateResponse: CandidateResponseDto = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    location: 'New York, NY',
    linkedinUrl: 'https://linkedin.com/in/johndoe',
    portfolioUrl: 'https://johndoe.dev',
    resumeUrl: 'https://example.com/resume.pdf',
    skillEmbeddings: [0.1, 0.2, 0.3],
    totalExperience: 5,
    consentGiven: true,
    consentDate: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockCandidateService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
    updateConsent: jest.fn(),
    updateSkillEmbeddings: jest.fn(),
    remove: jest.fn(),
    findCandidatesWithoutConsent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidateController],
      providers: [
        {
          provide: CandidateService,
          useValue: mockCandidateService,
        },
      ],
    }).compile();

    controller = module.get<CandidateController>(CandidateController);
    service = module.get<CandidateService>(CandidateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a candidate', async () => {
      const createCandidateDto: CreateCandidateDto = {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        consentGiven: true,
      };

      mockCandidateService.create.mockResolvedValue(mockCandidateResponse);

      const result = await controller.create(createCandidateDto);

      expect(service.create).toHaveBeenCalledWith(createCandidateDto);
      expect(result).toEqual(mockCandidateResponse);
    });
  });

  describe('findAll', () => {
    it('should return all candidates', async () => {
      const candidates = [mockCandidateResponse];
      mockCandidateService.findAll.mockResolvedValue(candidates);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(candidates);
    });

    it('should return candidates without consent when query parameter is set', async () => {
      const candidatesWithoutConsent = [
        { ...mockCandidateResponse, consentGiven: false },
      ];
      mockCandidateService.findCandidatesWithoutConsent.mockResolvedValue(
        candidatesWithoutConsent,
      );

      const result = await controller.findAll('true');

      expect(service.findCandidatesWithoutConsent).toHaveBeenCalled();
      expect(result).toEqual(candidatesWithoutConsent);
    });
  });

  describe('findOne', () => {
    it('should return a candidate by id', async () => {
      mockCandidateService.findOne.mockResolvedValue(mockCandidateResponse);

      const result = await controller.findOne(mockCandidateResponse.id);

      expect(service.findOne).toHaveBeenCalledWith(mockCandidateResponse.id);
      expect(result).toEqual(mockCandidateResponse);
    });
  });

  describe('findByEmail', () => {
    it('should return a candidate by email', async () => {
      mockCandidateService.findByEmail.mockResolvedValue(mockCandidateResponse);

      const result = await controller.findByEmail(mockCandidateResponse.email);

      expect(service.findByEmail).toHaveBeenCalledWith(
        mockCandidateResponse.email,
      );
      expect(result).toEqual(mockCandidateResponse);
    });
  });

  describe('update', () => {
    it('should update a candidate', async () => {
      const updateCandidateDto: UpdateCandidateDto = {
        firstName: 'Jane',
        location: 'San Francisco, CA',
      };
      const updatedCandidate = {
        ...mockCandidateResponse,
        ...updateCandidateDto,
      };
      mockCandidateService.update.mockResolvedValue(updatedCandidate);

      const result = await controller.update(
        mockCandidateResponse.id,
        updateCandidateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockCandidateResponse.id,
        updateCandidateDto,
      );
      expect(result).toEqual(updatedCandidate);
    });
  });

  describe('updateConsent', () => {
    it('should update candidate consent', async () => {
      const updatedCandidate = {
        ...mockCandidateResponse,
        consentGiven: false,
      };
      mockCandidateService.updateConsent.mockResolvedValue(updatedCandidate);

      const result = await controller.updateConsent(
        mockCandidateResponse.id,
        false,
      );

      expect(service.updateConsent).toHaveBeenCalledWith(
        mockCandidateResponse.id,
        false,
      );
      expect(result).toEqual(updatedCandidate);
    });
  });

  describe('updateSkillEmbeddings', () => {
    it('should update skill embeddings', async () => {
      const embeddings = [0.4, 0.5, 0.6];
      const updatedCandidate = {
        ...mockCandidateResponse,
        skillEmbeddings: embeddings,
      };
      mockCandidateService.updateSkillEmbeddings.mockResolvedValue(
        updatedCandidate,
      );

      const result = await controller.updateSkillEmbeddings(
        mockCandidateResponse.id,
        embeddings,
      );

      expect(service.updateSkillEmbeddings).toHaveBeenCalledWith(
        mockCandidateResponse.id,
        embeddings,
      );
      expect(result).toEqual(updatedCandidate);
    });
  });

  describe('remove', () => {
    it('should remove a candidate', async () => {
      mockCandidateService.remove.mockResolvedValue(undefined);

      await controller.remove(mockCandidateResponse.id);

      expect(service.remove).toHaveBeenCalledWith(mockCandidateResponse.id);
    });
  });
});
