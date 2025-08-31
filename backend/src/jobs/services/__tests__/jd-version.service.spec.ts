import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { JdVersionService } from '../jd-version.service';
import { JdVersion } from '../../../entities/jd-version.entity';
import { CompanyJobVariant } from '../../../entities/company-job-variant.entity';
import { User, UserRole } from '../../../entities/user.entity';
import { CompanyJobVariantService } from '../company-job-variant.service';
import { CreateJdVersionDto } from '../../dto/create-jd-version.dto';
import { UpdateJdVersionDto } from '../../dto/update-jd-version.dto';

describe('JdVersionService', () => {
  let service: JdVersionService;
  let jdVersionRepository: Repository<JdVersion>;
  let companyJobVariantRepository: Repository<CompanyJobVariant>;
  let userRepository: Repository<User>;
  let companyJobVariantService: CompanyJobVariantService;

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.RECRUITER,
  };

  const mockCompanyJobVariant = {
    id: 'variant-id',
    customTitle: 'Senior JavaScript Developer',
    customDescription: 'Custom description',
  };

  const mockResolvedJobSpec = {
    title: 'Senior JavaScript Developer',
    description: 'Custom description',
    requirements: [],
    company: {
      id: 'company-id',
      name: 'TechCorp',
      industry: 'Technology',
      benefits: ['Health Insurance'],
      culture: ['Innovation'],
    },
    salaryRange: {
      min: 80000,
      max: 120000,
      currency: 'USD',
    },
    benefits: ['Health Insurance'],
    workArrangement: 'Hybrid',
    location: 'San Francisco, CA',
  };

  const mockJdVersion = {
    id: 'jd-version-id',
    companyJobVariantId: 'variant-id',
    version: 1,
    resolvedSpec: mockResolvedJobSpec,
    publishedContent: '# Senior JavaScript Developer\n**Company:** TechCorp',
    createdById: 'user-id',
    createdAt: new Date(),
    companyJobVariant: mockCompanyJobVariant,
    createdBy: mockUser,
  };

  const mockJdVersionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockCompanyJobVariantRepository = {
    findOne: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockCompanyJobVariantService = {
    resolveJobSpec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JdVersionService,
        {
          provide: getRepositoryToken(JdVersion),
          useValue: mockJdVersionRepository,
        },
        {
          provide: getRepositoryToken(CompanyJobVariant),
          useValue: mockCompanyJobVariantRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: CompanyJobVariantService,
          useValue: mockCompanyJobVariantService,
        },
      ],
    }).compile();

    service = module.get<JdVersionService>(JdVersionService);
    jdVersionRepository = module.get<Repository<JdVersion>>(
      getRepositoryToken(JdVersion),
    );
    companyJobVariantRepository = module.get<Repository<CompanyJobVariant>>(
      getRepositoryToken(CompanyJobVariant),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    companyJobVariantService = module.get<CompanyJobVariantService>(
      CompanyJobVariantService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new JD version', async () => {
      const createDto: CreateJdVersionDto = {
        companyJobVariantId: 'variant-id',
        customTitle: 'Senior JavaScript Developer',
        customDescription: 'Custom description',
      };

      mockCompanyJobVariantRepository.findOne.mockResolvedValue(
        mockCompanyJobVariant,
      );
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJdVersionRepository.findOne.mockResolvedValue(null); // No previous versions
      mockCompanyJobVariantService.resolveJobSpec.mockResolvedValue(
        mockResolvedJobSpec,
      );
      mockJdVersionRepository.create.mockReturnValue(mockJdVersion);
      mockJdVersionRepository.save.mockResolvedValue(mockJdVersion);

      // Mock findOne for the final return
      jest.spyOn(service, 'findOne').mockResolvedValue(mockJdVersion as any);

      const result = await service.create(createDto, 'user-id');

      expect(mockCompanyJobVariantRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'variant-id' },
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
      expect(mockCompanyJobVariantService.resolveJobSpec).toHaveBeenCalledWith(
        'variant-id',
      );
      expect(mockJdVersionRepository.create).toHaveBeenCalledWith({
        companyJobVariantId: 'variant-id',
        version: 1,
        resolvedSpec: mockResolvedJobSpec,
        publishedContent: expect.any(String),
        createdById: 'user-id',
      });
      expect(result.id).toBe(mockJdVersion.id);
    });

    it('should create version 2 when previous version exists', async () => {
      const createDto: CreateJdVersionDto = {
        companyJobVariantId: 'variant-id',
      };

      const previousVersion = { ...mockJdVersion, version: 1 };

      mockCompanyJobVariantRepository.findOne.mockResolvedValue(
        mockCompanyJobVariant,
      );
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJdVersionRepository.findOne.mockResolvedValue(previousVersion); // Previous version exists
      mockCompanyJobVariantService.resolveJobSpec.mockResolvedValue(
        mockResolvedJobSpec,
      );
      mockJdVersionRepository.create.mockReturnValue({
        ...mockJdVersion,
        version: 2,
      });
      mockJdVersionRepository.save.mockResolvedValue({
        ...mockJdVersion,
        version: 2,
      });
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ ...mockJdVersion, version: 2 } as any);

      const result = await service.create(createDto, 'user-id');

      expect(mockJdVersionRepository.create).toHaveBeenCalledWith({
        companyJobVariantId: 'variant-id',
        version: 2,
        resolvedSpec: mockResolvedJobSpec,
        publishedContent: expect.any(String),
        createdById: 'user-id',
      });
      expect(result.version).toBe(2);
    });

    it('should throw NotFoundException when company job variant not found', async () => {
      const createDto: CreateJdVersionDto = {
        companyJobVariantId: 'non-existent-id',
      };

      mockCompanyJobVariantRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, 'user-id')).rejects.toThrow(
        new NotFoundException(
          'CompanyJobVariant with ID non-existent-id not found',
        ),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      const createDto: CreateJdVersionDto = {
        companyJobVariantId: 'variant-id',
      };

      mockCompanyJobVariantRepository.findOne.mockResolvedValue(
        mockCompanyJobVariant,
      );
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(createDto, 'non-existent-user'),
      ).rejects.toThrow(
        new NotFoundException('User with ID non-existent-user not found'),
      );
    });
  });

  describe('findAll', () => {
    it('should return all JD versions', async () => {
      const jdVersions = [mockJdVersion];
      mockJdVersionRepository.find.mockResolvedValue(jdVersions);

      const result = await service.findAll();

      expect(mockJdVersionRepository.find).toHaveBeenCalledWith({
        relations: ['companyJobVariant', 'createdBy'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockJdVersion.id);
    });
  });

  describe('findOne', () => {
    it('should return a JD version by id', async () => {
      mockJdVersionRepository.findOne.mockResolvedValue(mockJdVersion);

      const result = await service.findOne('jd-version-id');

      expect(mockJdVersionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'jd-version-id' },
        relations: ['companyJobVariant', 'createdBy'],
      });
      expect(result.id).toBe(mockJdVersion.id);
    });

    it('should throw NotFoundException when JD version not found', async () => {
      mockJdVersionRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException('JdVersion with ID non-existent-id not found'),
      );
    });
  });

  describe('findByCompanyJobVariant', () => {
    it('should return JD versions by company job variant id', async () => {
      const jdVersions = [mockJdVersion];
      mockJdVersionRepository.find.mockResolvedValue(jdVersions);

      const result = await service.findByCompanyJobVariant('variant-id');

      expect(mockJdVersionRepository.find).toHaveBeenCalledWith({
        where: { companyJobVariantId: 'variant-id' },
        relations: ['companyJobVariant', 'createdBy'],
        order: { version: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findLatestByCompanyJobVariant', () => {
    it('should return latest JD version by company job variant id', async () => {
      mockJdVersionRepository.findOne.mockResolvedValue(mockJdVersion);

      const result = await service.findLatestByCompanyJobVariant('variant-id');

      expect(mockJdVersionRepository.findOne).toHaveBeenCalledWith({
        where: { companyJobVariantId: 'variant-id' },
        relations: ['companyJobVariant', 'createdBy'],
        order: { version: 'DESC' },
      });
      expect(result.id).toBe(mockJdVersion.id);
    });

    it('should throw NotFoundException when no JD version found', async () => {
      mockJdVersionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findLatestByCompanyJobVariant('non-existent-id'),
      ).rejects.toThrow(
        new NotFoundException(
          'No JdVersion found for CompanyJobVariant with ID non-existent-id',
        ),
      );
    });
  });

  describe('update', () => {
    it('should update a JD version', async () => {
      const updateDto: UpdateJdVersionDto = {
        customTitle: 'Updated Senior JavaScript Developer',
      };

      const updatedJdVersion = { ...mockJdVersion, ...updateDto };

      mockJdVersionRepository.findOne.mockResolvedValue(mockJdVersion);
      mockCompanyJobVariantService.resolveJobSpec.mockResolvedValue({
        ...mockResolvedJobSpec,
        title: updateDto.customTitle,
      });
      mockJdVersionRepository.save.mockResolvedValue(updatedJdVersion);
      jest.spyOn(service, 'findOne').mockResolvedValue(updatedJdVersion as any);

      const result = await service.update('jd-version-id', updateDto);

      expect(mockJdVersionRepository.save).toHaveBeenCalled();
      expect(result.resolvedSpec.title).toBe(updateDto.customTitle);
    });

    it('should throw NotFoundException when JD version not found', async () => {
      const updateDto: UpdateJdVersionDto = { customTitle: 'Updated' };
      mockJdVersionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateDto),
      ).rejects.toThrow(
        new NotFoundException('JdVersion with ID non-existent-id not found'),
      );
    });
  });

  describe('regenerateJobDescription', () => {
    it('should regenerate job description from resolved spec', async () => {
      const updatedJdVersion = {
        ...mockJdVersion,
        publishedContent: 'Updated job description content',
      };

      mockJdVersionRepository.findOne.mockResolvedValue(mockJdVersion);
      mockJdVersionRepository.save.mockResolvedValue(updatedJdVersion);

      const result = await service.regenerateJobDescription('jd-version-id');

      expect(mockJdVersionRepository.save).toHaveBeenCalled();
      expect(result.publishedContent).toContain('Senior JavaScript Developer');
    });

    it('should throw NotFoundException when JD version not found', async () => {
      mockJdVersionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.regenerateJobDescription('non-existent-id'),
      ).rejects.toThrow(
        new NotFoundException('JdVersion with ID non-existent-id not found'),
      );
    });
  });

  describe('remove', () => {
    it('should remove a JD version', async () => {
      mockJdVersionRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove('jd-version-id');

      expect(mockJdVersionRepository.delete).toHaveBeenCalledWith(
        'jd-version-id',
      );
    });

    it('should throw NotFoundException when JD version not found', async () => {
      mockJdVersionRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        new NotFoundException('JdVersion with ID non-existent-id not found'),
      );
    });
  });
});
