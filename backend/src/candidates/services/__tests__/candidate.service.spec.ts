import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CandidateService } from '../candidate.service';
import { Candidate } from '../../../entities/candidate.entity';
import { CreateCandidateDto } from '../../dto/create-candidate.dto';
import { UpdateCandidateDto } from '../../dto/update-candidate.dto';

describe('CandidateService', () => {
  let service: CandidateService;
  let repository: Repository<Candidate>;

  const mockCandidate = {
    id: 'candidate-id',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    location: 'San Francisco, CA',
    linkedinUrl: 'https://linkedin.com/in/johndoe',
    portfolioUrl: 'https://johndoe.dev',
    resumeUrl: 'https://storage.example.com/resume.pdf',
    skillEmbeddings: [0.1, 0.2, 0.3],
    totalExperience: 5.5,
    consentGiven: true,
    consentDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    parsedData: null,
    applications: [],
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateService,
        {
          provide: getRepositoryToken(Candidate),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CandidateService>(CandidateService);
    repository = module.get<Repository<Candidate>>(
      getRepositoryToken(Candidate),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new candidate', async () => {
      const createDto: CreateCandidateDto = {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        consentGiven: true,
      };

      mockRepository.findOne.mockResolvedValue(null); // No existing candidate
      mockRepository.create.mockReturnValue(mockCandidate);
      mockRepository.save.mockResolvedValue(mockCandidate);

      const result = await service.create(createDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: createDto.email },
      });
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDto,
        consentDate: expect.any(Date),
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockCandidate);
      expect(result).toEqual({
        id: mockCandidate.id,
        email: mockCandidate.email,
        firstName: mockCandidate.firstName,
        lastName: mockCandidate.lastName,
        phone: mockCandidate.phone,
        location: mockCandidate.location,
        linkedinUrl: mockCandidate.linkedinUrl,
        portfolioUrl: mockCandidate.portfolioUrl,
        resumeUrl: mockCandidate.resumeUrl,
        skillEmbeddings: mockCandidate.skillEmbeddings,
        totalExperience: mockCandidate.totalExperience,
        consentGiven: mockCandidate.consentGiven,
        consentDate: mockCandidate.consentDate,
        createdAt: mockCandidate.createdAt,
        updatedAt: mockCandidate.updatedAt,
        parsedData: mockCandidate.parsedData,
        applications: mockCandidate.applications,
      });
    });

    it('should create candidate without consent date when consent not given', async () => {
      const createDto: CreateCandidateDto = {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        consentGiven: false,
      };

      const candidateWithoutConsent = {
        ...mockCandidate,
        consentGiven: false,
        consentDate: null,
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(candidateWithoutConsent);
      mockRepository.save.mockResolvedValue(candidateWithoutConsent);

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDto,
        consentDate: null,
      });
      expect(result.consentGiven).toBe(false);
      expect(result.consentDate).toBeNull();
    });

    it('should throw ConflictException when candidate with email already exists', async () => {
      const createDto: CreateCandidateDto = {
        email: 'existing@example.com',
        firstName: 'John',
        lastName: 'Doe',
        consentGiven: true,
      };

      mockRepository.findOne.mockResolvedValue(mockCandidate);

      await expect(service.create(createDto)).rejects.toThrow(
        new ConflictException(
          'Candidate with email existing@example.com already exists',
        ),
      );
    });
  });

  describe('findAll', () => {
    it('should return all candidates', async () => {
      const candidates = [mockCandidate];
      mockRepository.find.mockResolvedValue(candidates);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        relations: ['parsedData', 'applications'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockCandidate.id);
    });

    it('should return empty array when no candidates exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a candidate by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockCandidate);

      const result = await service.findOne('candidate-id');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'candidate-id' },
        relations: ['parsedData', 'applications'],
      });
      expect(result.id).toBe(mockCandidate.id);
    });

    it('should throw NotFoundException when candidate not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException('Candidate with ID non-existent-id not found'),
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a candidate by email', async () => {
      mockRepository.findOne.mockResolvedValue(mockCandidate);

      const result = await service.findByEmail('john.doe@example.com');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'john.doe@example.com' },
        relations: ['parsedData', 'applications'],
      });
      expect(result?.id).toBe(mockCandidate.id);
    });

    it('should return null when candidate not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a candidate', async () => {
      const updateDto: UpdateCandidateDto = {
        firstName: 'Updated John',
        phone: '+9876543210',
      };

      const updatedCandidate = { ...mockCandidate, ...updateDto };

      mockRepository.findOne.mockResolvedValue(mockCandidate);
      mockRepository.save.mockResolvedValue(updatedCandidate);

      const result = await service.update('candidate-id', updateDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'candidate-id' },
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.firstName).toBe(updateDto.firstName);
      expect(result.phone).toBe(updateDto.phone);
    });

    it('should throw NotFoundException when candidate not found', async () => {
      const updateDto: UpdateCandidateDto = { firstName: 'Updated' };
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateDto),
      ).rejects.toThrow(
        new NotFoundException('Candidate with ID non-existent-id not found'),
      );
    });

    it('should throw ConflictException when updating to existing email', async () => {
      const updateDto: UpdateCandidateDto = {
        email: 'existing@example.com',
      };

      const existingCandidate = { ...mockCandidate, id: 'other-id' };

      mockRepository.findOne
        .mockResolvedValueOnce(mockCandidate) // First call for finding the candidate to update
        .mockResolvedValueOnce(existingCandidate); // Second call for checking email conflict

      await expect(service.update('candidate-id', updateDto)).rejects.toThrow(
        new ConflictException(
          'Candidate with email existing@example.com already exists',
        ),
      );
    });

    it('should update consent date when granting consent for first time', async () => {
      const candidateWithoutConsent = {
        ...mockCandidate,
        consentGiven: false,
        consentDate: null,
      };
      const updateDto: UpdateCandidateDto = { consentGiven: true };

      mockRepository.findOne.mockResolvedValue(candidateWithoutConsent);
      mockRepository.save.mockResolvedValue({
        ...candidateWithoutConsent,
        consentGiven: true,
        consentDate: expect.any(Date),
      });

      const result = await service.update('candidate-id', updateDto);

      expect(result.consentGiven).toBe(true);
      expect(result.consentDate).toBeDefined();
    });
  });

  describe('updateConsent', () => {
    it('should update candidate consent', async () => {
      const updatedCandidate = {
        ...mockCandidate,
        consentGiven: true,
        consentDate: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockCandidate);
      mockRepository.save.mockResolvedValue(updatedCandidate);

      const result = await service.updateConsent('candidate-id', true);

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.consentGiven).toBe(true);
      expect(result.consentDate).toBeDefined();
    });

    it('should revoke consent and clear consent date', async () => {
      const updatedCandidate = {
        ...mockCandidate,
        consentGiven: false,
        consentDate: null,
      };

      mockRepository.findOne.mockResolvedValue(mockCandidate);
      mockRepository.save.mockResolvedValue(updatedCandidate);

      const result = await service.updateConsent('candidate-id', false);

      expect(result.consentGiven).toBe(false);
      expect(result.consentDate).toBeNull();
    });

    it('should throw NotFoundException when candidate not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateConsent('non-existent-id', true),
      ).rejects.toThrow(
        new NotFoundException('Candidate with ID non-existent-id not found'),
      );
    });
  });

  describe('findCandidatesWithoutConsent', () => {
    it('should return candidates without consent', async () => {
      const candidatesWithoutConsent = [
        { ...mockCandidate, consentGiven: false, consentDate: null },
      ];
      mockRepository.find.mockResolvedValue(candidatesWithoutConsent);

      const result = await service.findCandidatesWithoutConsent();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { consentGiven: false },
        relations: ['parsedData'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].consentGiven).toBe(false);
    });
  });

  describe('updateSkillEmbeddings', () => {
    it('should update candidate skill embeddings', async () => {
      const newEmbeddings = [0.4, 0.5, 0.6];
      const updatedCandidate = {
        ...mockCandidate,
        skillEmbeddings: newEmbeddings,
      };

      mockRepository.findOne.mockResolvedValue(mockCandidate);
      mockRepository.save.mockResolvedValue(updatedCandidate);

      const result = await service.updateSkillEmbeddings(
        'candidate-id',
        newEmbeddings,
      );

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.skillEmbeddings).toEqual(newEmbeddings);
    });

    it('should throw NotFoundException when candidate not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateSkillEmbeddings('non-existent-id', [0.1, 0.2]),
      ).rejects.toThrow(
        new NotFoundException('Candidate with ID non-existent-id not found'),
      );
    });
  });

  describe('remove', () => {
    it('should remove a candidate', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove('candidate-id');

      expect(mockRepository.delete).toHaveBeenCalledWith('candidate-id');
    });

    it('should throw NotFoundException when candidate not found', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        new NotFoundException('Candidate with ID non-existent-id not found'),
      );
    });
  });
});
