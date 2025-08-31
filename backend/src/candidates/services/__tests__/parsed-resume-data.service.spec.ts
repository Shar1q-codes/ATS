import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ParsedResumeDataService } from '../parsed-resume-data.service';
import {
  ParsedResumeData,
  Skill,
  WorkExperience,
} from '../../../entities/parsed-resume-data.entity';
import { Candidate } from '../../../entities/candidate.entity';
import { CreateParsedResumeDataDto } from '../../dto/create-parsed-resume-data.dto';
import { UpdateParsedResumeDataDto } from '../../dto/update-parsed-resume-data.dto';

describe('ParsedResumeDataService', () => {
  let service: ParsedResumeDataService;
  let parsedResumeDataRepository: Repository<ParsedResumeData>;
  let candidateRepository: Repository<Candidate>;

  const mockCandidate = {
    id: 'candidate-id',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockSkills: Skill[] = [
    {
      name: 'JavaScript',
      category: 'Programming Languages',
      proficiency: 8,
      yearsOfExperience: 3,
    },
    {
      name: 'React',
      category: 'Frameworks & Libraries',
      proficiency: 7,
      yearsOfExperience: 2,
    },
  ];

  const mockWorkExperience: WorkExperience[] = [
    {
      company: 'TechCorp',
      position: 'Software Engineer',
      startDate: '2020-01-01',
      endDate: '2023-01-01',
      isCurrent: false,
      description: 'Developed web applications',
    },
    {
      company: 'StartupXYZ',
      position: 'Senior Developer',
      startDate: '2023-02-01',
      endDate: null,
      isCurrent: true,
      description: 'Leading development team',
    },
  ];

  const mockParsedResumeData = {
    id: 'parsed-data-id',
    candidateId: 'candidate-id',
    skills: mockSkills,
    experience: mockWorkExperience,
    education: [],
    certifications: [],
    summary: 'Experienced software engineer',
    rawText: 'Resume raw text content',
    parsingConfidence: 0.95,
    createdAt: new Date(),
    candidate: mockCandidate,
  };

  const mockParsedResumeDataRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockCandidateRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParsedResumeDataService,
        {
          provide: getRepositoryToken(ParsedResumeData),
          useValue: mockParsedResumeDataRepository,
        },
        {
          provide: getRepositoryToken(Candidate),
          useValue: mockCandidateRepository,
        },
      ],
    }).compile();

    service = module.get<ParsedResumeDataService>(ParsedResumeDataService);
    parsedResumeDataRepository = module.get<Repository<ParsedResumeData>>(
      getRepositoryToken(ParsedResumeData),
    );
    candidateRepository = module.get<Repository<Candidate>>(
      getRepositoryToken(Candidate),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create new parsed resume data', async () => {
      const createDto: CreateParsedResumeDataDto = {
        candidateId: 'candidate-id',
        skills: mockSkills,
        experience: mockWorkExperience,
        education: [],
        certifications: [],
        summary: 'Experienced software engineer',
        rawText: 'Resume raw text content',
        parsingConfidence: 0.95,
      };

      mockCandidateRepository.findOne.mockResolvedValue(mockCandidate);
      mockParsedResumeDataRepository.findOne.mockResolvedValue(null); // No existing data
      mockParsedResumeDataRepository.create.mockReturnValue(
        mockParsedResumeData,
      );
      mockParsedResumeDataRepository.save.mockResolvedValue(
        mockParsedResumeData,
      );
      mockCandidateRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.create(createDto);

      expect(mockCandidateRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'candidate-id' },
      });
      expect(mockParsedResumeDataRepository.findOne).toHaveBeenCalledWith({
        where: { candidateId: 'candidate-id' },
      });
      expect(mockParsedResumeDataRepository.create).toHaveBeenCalledWith({
        ...createDto,
        skills: expect.any(Array), // Normalized skills
      });
      expect(mockCandidateRepository.update).toHaveBeenCalledWith(
        'candidate-id',
        { totalExperience: expect.any(Number) },
      );
      expect(result.id).toBe(mockParsedResumeData.id);
    });

    it('should throw NotFoundException when candidate not found', async () => {
      const createDto: CreateParsedResumeDataDto = {
        candidateId: 'non-existent-id',
        skills: [],
        experience: [],
      };

      mockCandidateRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        new NotFoundException('Candidate with ID non-existent-id not found'),
      );
    });

    it('should throw BadRequestException when parsed data already exists', async () => {
      const createDto: CreateParsedResumeDataDto = {
        candidateId: 'candidate-id',
        skills: [],
        experience: [],
      };

      mockCandidateRepository.findOne.mockResolvedValue(mockCandidate);
      mockParsedResumeDataRepository.findOne.mockResolvedValue(
        mockParsedResumeData,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        new BadRequestException(
          'Parsed resume data already exists for candidate candidate-id',
        ),
      );
    });
  });

  describe('findAll', () => {
    it('should return all parsed resume data', async () => {
      const parsedDataList = [mockParsedResumeData];
      mockParsedResumeDataRepository.find.mockResolvedValue(parsedDataList);

      const result = await service.findAll();

      expect(mockParsedResumeDataRepository.find).toHaveBeenCalledWith({
        relations: ['candidate'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockParsedResumeData.id);
    });
  });

  describe('findOne', () => {
    it('should return parsed resume data by id', async () => {
      mockParsedResumeDataRepository.findOne.mockResolvedValue(
        mockParsedResumeData,
      );

      const result = await service.findOne('parsed-data-id');

      expect(mockParsedResumeDataRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'parsed-data-id' },
        relations: ['candidate'],
      });
      expect(result.id).toBe(mockParsedResumeData.id);
    });

    it('should throw NotFoundException when parsed data not found', async () => {
      mockParsedResumeDataRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException(
          'ParsedResumeData with ID non-existent-id not found',
        ),
      );
    });
  });

  describe('findByCandidateId', () => {
    it('should return parsed resume data by candidate id', async () => {
      mockParsedResumeDataRepository.findOne.mockResolvedValue(
        mockParsedResumeData,
      );

      const result = await service.findByCandidateId('candidate-id');

      expect(mockParsedResumeDataRepository.findOne).toHaveBeenCalledWith({
        where: { candidateId: 'candidate-id' },
        relations: ['candidate'],
      });
      expect(result?.id).toBe(mockParsedResumeData.id);
    });

    it('should return null when no data found', async () => {
      mockParsedResumeDataRepository.findOne.mockResolvedValue(null);

      const result = await service.findByCandidateId('candidate-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update parsed resume data', async () => {
      const updateDto: UpdateParsedResumeDataDto = {
        summary: 'Updated summary',
        skills: [
          {
            name: 'TypeScript',
            category: 'Programming Languages',
            proficiency: 9,
            yearsOfExperience: 4,
          },
        ],
      };

      const updatedData = { ...mockParsedResumeData, ...updateDto };

      mockParsedResumeDataRepository.findOne.mockResolvedValue(
        mockParsedResumeData,
      );
      mockParsedResumeDataRepository.save.mockResolvedValue(updatedData);

      const result = await service.update('parsed-data-id', updateDto);

      expect(mockParsedResumeDataRepository.save).toHaveBeenCalled();
      expect(result.summary).toBe(updateDto.summary);
    });

    it('should recalculate total experience when updating work experience', async () => {
      const updateDto: UpdateParsedResumeDataDto = {
        experience: [
          {
            company: 'NewCorp',
            position: 'Lead Developer',
            startDate: '2021-01-01',
            endDate: '2024-01-01',
            isCurrent: false,
            description: 'Leading development',
          },
        ],
      };

      mockParsedResumeDataRepository.findOne.mockResolvedValue(
        mockParsedResumeData,
      );
      mockParsedResumeDataRepository.save.mockResolvedValue({
        ...mockParsedResumeData,
        ...updateDto,
      });
      mockCandidateRepository.update.mockResolvedValue({ affected: 1 });

      await service.update('parsed-data-id', updateDto);

      expect(mockCandidateRepository.update).toHaveBeenCalledWith(
        'candidate-id',
        { totalExperience: expect.any(Number) },
      );
    });

    it('should throw NotFoundException when parsed data not found', async () => {
      const updateDto: UpdateParsedResumeDataDto = { summary: 'Updated' };
      mockParsedResumeDataRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateDto),
      ).rejects.toThrow(
        new NotFoundException(
          'ParsedResumeData with ID non-existent-id not found',
        ),
      );
    });
  });

  describe('getSkillsByCategory', () => {
    it('should return skills grouped by category', async () => {
      mockParsedResumeDataRepository.findOne.mockResolvedValue(
        mockParsedResumeData,
      );

      const result = await service.getSkillsByCategory('candidate-id');

      expect(result['Programming Languages']).toHaveLength(1);
      expect(result['Frameworks & Libraries']).toHaveLength(1);
      expect(result['Programming Languages'][0].name).toBe('JavaScript');
    });

    it('should return empty object when no skills found', async () => {
      mockParsedResumeDataRepository.findOne.mockResolvedValue({
        ...mockParsedResumeData,
        skills: null,
      });

      const result = await service.getSkillsByCategory('candidate-id');

      expect(result).toEqual({});
    });
  });

  describe('updateSkillProficiency', () => {
    it('should update skill proficiency', async () => {
      const updatedData = {
        ...mockParsedResumeData,
        skills: [{ ...mockSkills[0], proficiency: 9 }, mockSkills[1]],
      };

      mockParsedResumeDataRepository.findOne.mockResolvedValue(
        mockParsedResumeData,
      );
      mockParsedResumeDataRepository.save.mockResolvedValue(updatedData);

      const result = await service.updateSkillProficiency(
        'parsed-data-id',
        'JavaScript',
        9,
      );

      expect(mockParsedResumeDataRepository.save).toHaveBeenCalled();
      expect(result.skills?.[0].proficiency).toBe(9);
    });

    it('should throw NotFoundException when parsed data not found', async () => {
      mockParsedResumeDataRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateSkillProficiency('non-existent-id', 'JavaScript', 9),
      ).rejects.toThrow(
        new NotFoundException(
          'ParsedResumeData with ID non-existent-id not found',
        ),
      );
    });

    it('should throw BadRequestException when no skills found', async () => {
      mockParsedResumeDataRepository.findOne.mockResolvedValue({
        ...mockParsedResumeData,
        skills: null,
      });

      await expect(
        service.updateSkillProficiency('parsed-data-id', 'JavaScript', 9),
      ).rejects.toThrow(
        new BadRequestException('No skills found in parsed resume data'),
      );
    });

    it('should throw NotFoundException when skill not found', async () => {
      mockParsedResumeDataRepository.findOne.mockResolvedValue(
        mockParsedResumeData,
      );

      await expect(
        service.updateSkillProficiency('parsed-data-id', 'NonExistentSkill', 9),
      ).rejects.toThrow(
        new NotFoundException(
          "Skill 'NonExistentSkill' not found in parsed resume data",
        ),
      );
    });
  });

  describe('remove', () => {
    it('should remove parsed resume data', async () => {
      mockParsedResumeDataRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove('parsed-data-id');

      expect(mockParsedResumeDataRepository.delete).toHaveBeenCalledWith(
        'parsed-data-id',
      );
    });

    it('should throw NotFoundException when parsed data not found', async () => {
      mockParsedResumeDataRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        new NotFoundException(
          'ParsedResumeData with ID non-existent-id not found',
        ),
      );
    });
  });

  describe('private methods', () => {
    it('should calculate total experience correctly', () => {
      // Test the private method indirectly through create
      const workExperience: WorkExperience[] = [
        {
          company: 'Company1',
          position: 'Developer',
          startDate: '2020-01-01',
          endDate: '2022-01-01',
          isCurrent: false,
          description: 'Work description',
        },
        {
          company: 'Company2',
          position: 'Senior Developer',
          startDate: '2022-02-01',
          endDate: null,
          isCurrent: true,
          description: 'Current work',
        },
      ];

      const createDto: CreateParsedResumeDataDto = {
        candidateId: 'candidate-id',
        experience: workExperience,
        skills: [],
      };

      mockCandidateRepository.findOne.mockResolvedValue(mockCandidate);
      mockParsedResumeDataRepository.findOne.mockResolvedValue(null);
      mockParsedResumeDataRepository.create.mockReturnValue(
        mockParsedResumeData,
      );
      mockParsedResumeDataRepository.save.mockResolvedValue(
        mockParsedResumeData,
      );
      mockCandidateRepository.update.mockResolvedValue({ affected: 1 });

      service.create(createDto);

      // Verify that update was called with a calculated total experience
      expect(mockCandidateRepository.update).toHaveBeenCalledWith(
        'candidate-id',
        { totalExperience: expect.any(Number) },
      );
    });

    it('should normalize skills correctly', async () => {
      const skillsWithDuplicates: Skill[] = [
        { name: 'javascript', proficiency: 7 },
        { name: 'JavaScript', proficiency: 8 },
        { name: 'react', proficiency: 6 },
      ];

      const createDto: CreateParsedResumeDataDto = {
        candidateId: 'candidate-id',
        skills: skillsWithDuplicates,
        experience: [],
      };

      mockCandidateRepository.findOne.mockResolvedValue(mockCandidate);
      mockParsedResumeDataRepository.findOne.mockResolvedValue(null);
      mockParsedResumeDataRepository.create.mockImplementation((data) => {
        // Verify that skills were normalized (duplicates removed, names capitalized)
        expect(data.skills).toHaveLength(2); // Duplicates removed
        expect(
          data.skills.find((s: Skill) => s.name === 'JavaScript')?.proficiency,
        ).toBe(8); // Higher proficiency kept
        return mockParsedResumeData;
      });
      mockParsedResumeDataRepository.save.mockResolvedValue(
        mockParsedResumeData,
      );
      mockCandidateRepository.update.mockResolvedValue({ affected: 1 });

      await service.create(createDto);
    });
  });
});
