import { Test, TestingModule } from '@nestjs/testing';
import { ParsedResumeDataController } from '../parsed-resume-data.controller';
import { ParsedResumeDataService } from '../../services/parsed-resume-data.service';
import { CreateParsedResumeDataDto } from '../../dto/create-parsed-resume-data.dto';
import { UpdateParsedResumeDataDto } from '../../dto/update-parsed-resume-data.dto';
import { ParsedResumeDataResponseDto } from '../../dto/parsed-resume-data-response.dto';
import { Skill } from '../../../entities/parsed-resume-data.entity';

describe('ParsedResumeDataController', () => {
  let controller: ParsedResumeDataController;
  let service: ParsedResumeDataService;

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

  const mockParsedResumeDataResponse: ParsedResumeDataResponseDto = {
    id: '456e7890-e89b-12d3-a456-426614174001',
    candidateId: '123e4567-e89b-12d3-a456-426614174000',
    skills: mockSkills,
    experience: [],
    education: [],
    certifications: [],
    summary: 'Experienced software engineer',
    rawText: 'Raw resume text...',
    parsingConfidence: 0.95,
    createdAt: new Date('2024-01-01'),
  };

  const mockParsedResumeDataService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByCandidateId: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getSkillsByCategory: jest.fn(),
    updateSkillProficiency: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParsedResumeDataController],
      providers: [
        {
          provide: ParsedResumeDataService,
          useValue: mockParsedResumeDataService,
        },
      ],
    }).compile();

    controller = module.get<ParsedResumeDataController>(
      ParsedResumeDataController,
    );
    service = module.get<ParsedResumeDataService>(ParsedResumeDataService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create parsed resume data', async () => {
      const createParsedResumeDataDto: CreateParsedResumeDataDto = {
        candidateId: '123e4567-e89b-12d3-a456-426614174000',
        skills: mockSkills,
        summary: 'Experienced software engineer',
        parsingConfidence: 0.95,
      };

      mockParsedResumeDataService.create.mockResolvedValue(
        mockParsedResumeDataResponse,
      );

      const result = await controller.create(createParsedResumeDataDto);

      expect(service.create).toHaveBeenCalledWith(createParsedResumeDataDto);
      expect(result).toEqual(mockParsedResumeDataResponse);
    });
  });

  describe('findAll', () => {
    it('should return all parsed resume data', async () => {
      const parsedDataList = [mockParsedResumeDataResponse];
      mockParsedResumeDataService.findAll.mockResolvedValue(parsedDataList);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(parsedDataList);
    });
  });

  describe('findOne', () => {
    it('should return parsed resume data by id', async () => {
      mockParsedResumeDataService.findOne.mockResolvedValue(
        mockParsedResumeDataResponse,
      );

      const result = await controller.findOne(mockParsedResumeDataResponse.id);

      expect(service.findOne).toHaveBeenCalledWith(
        mockParsedResumeDataResponse.id,
      );
      expect(result).toEqual(mockParsedResumeDataResponse);
    });
  });

  describe('findByCandidateId', () => {
    it('should return parsed resume data by candidate id', async () => {
      mockParsedResumeDataService.findByCandidateId.mockResolvedValue(
        mockParsedResumeDataResponse,
      );

      const result = await controller.findByCandidateId(
        mockParsedResumeDataResponse.candidateId,
      );

      expect(service.findByCandidateId).toHaveBeenCalledWith(
        mockParsedResumeDataResponse.candidateId,
      );
      expect(result).toEqual(mockParsedResumeDataResponse);
    });
  });

  describe('getSkillsByCategory', () => {
    it('should return skills grouped by category', async () => {
      const skillsByCategory = {
        'Programming Languages': [mockSkills[0]],
        'Frameworks & Libraries': [mockSkills[1]],
      };
      mockParsedResumeDataService.findOne.mockResolvedValue(
        mockParsedResumeDataResponse,
      );
      mockParsedResumeDataService.getSkillsByCategory.mockResolvedValue(
        skillsByCategory,
      );

      const result = await controller.getSkillsByCategory(
        mockParsedResumeDataResponse.id,
      );

      expect(service.findOne).toHaveBeenCalledWith(
        mockParsedResumeDataResponse.id,
      );
      expect(service.getSkillsByCategory).toHaveBeenCalledWith(
        mockParsedResumeDataResponse.candidateId,
      );
      expect(result).toEqual(skillsByCategory);
    });
  });

  describe('update', () => {
    it('should update parsed resume data', async () => {
      const updateParsedResumeDataDto: UpdateParsedResumeDataDto = {
        summary: 'Updated summary',
        parsingConfidence: 0.98,
      };
      const updatedParsedData = {
        ...mockParsedResumeDataResponse,
        ...updateParsedResumeDataDto,
      };
      mockParsedResumeDataService.update.mockResolvedValue(updatedParsedData);

      const result = await controller.update(
        mockParsedResumeDataResponse.id,
        updateParsedResumeDataDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockParsedResumeDataResponse.id,
        updateParsedResumeDataDto,
      );
      expect(result).toEqual(updatedParsedData);
    });
  });

  describe('updateSkillProficiency', () => {
    it('should update skill proficiency', async () => {
      const updatedParsedData = { ...mockParsedResumeDataResponse };
      updatedParsedData.skills![0].proficiency = 9;
      mockParsedResumeDataService.updateSkillProficiency.mockResolvedValue(
        updatedParsedData,
      );

      const result = await controller.updateSkillProficiency(
        mockParsedResumeDataResponse.id,
        'JavaScript',
        9,
      );

      expect(service.updateSkillProficiency).toHaveBeenCalledWith(
        mockParsedResumeDataResponse.id,
        'JavaScript',
        9,
      );
      expect(result).toEqual(updatedParsedData);
    });
  });

  describe('remove', () => {
    it('should remove parsed resume data', async () => {
      mockParsedResumeDataService.remove.mockResolvedValue(undefined);

      await controller.remove(mockParsedResumeDataResponse.id);

      expect(service.remove).toHaveBeenCalledWith(
        mockParsedResumeDataResponse.id,
      );
    });
  });
});
