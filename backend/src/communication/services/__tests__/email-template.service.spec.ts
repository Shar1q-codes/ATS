import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EmailTemplateService } from '../email-template.service';
import {
  EmailTemplate,
  EmailTemplateType,
  EmailTemplateStatus,
} from '../../../entities';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto } from '../../dto';

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;
  let repository: jest.Mocked<Repository<EmailTemplate>>;

  const mockEmailTemplate: EmailTemplate = {
    id: 'template-1',
    name: 'Welcome Email',
    type: EmailTemplateType.APPLICATION_RECEIVED,
    subject: 'Welcome to {{company.name}}',
    htmlContent: '<p>Welcome {{candidate.firstName}}!</p>',
    textContent: 'Welcome {{candidate.firstName}}!',
    status: EmailTemplateStatus.ACTIVE,
    mergeFields: ['candidate.firstName', 'company.name'],
    description: 'Welcome email for new applications',
    companyProfileId: 'company-1',
    createdBy: 'user-1',
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    companyProfile: null,
    creator: null,
    updater: null,
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailTemplateService,
        {
          provide: getRepositoryToken(EmailTemplate),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<EmailTemplateService>(EmailTemplateService);
    repository = module.get(getRepositoryToken(EmailTemplate));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateEmailTemplateDto = {
      name: 'Test Template',
      type: EmailTemplateType.APPLICATION_RECEIVED,
      subject: 'Test Subject',
      htmlContent: '<p>Test content</p>',
      status: EmailTemplateStatus.DRAFT,
      companyProfileId: 'company-1',
    };

    it('should create email template successfully', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockEmailTemplate);
      repository.save.mockResolvedValue(mockEmailTemplate);

      const result = await service.create(createDto, 'user-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          name: createDto.name,
          type: createDto.type,
          companyProfileId: createDto.companyProfileId,
        },
      });
      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        createdBy: 'user-1',
        status: EmailTemplateStatus.DRAFT,
      });
      expect(repository.save).toHaveBeenCalledWith(mockEmailTemplate);
      expect(result).toEqual(mockEmailTemplate);
    });

    it('should throw ConflictException if template with same name and type exists', async () => {
      repository.findOne.mockResolvedValue(mockEmailTemplate);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        ConflictException,
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should set default status to DRAFT if not provided', async () => {
      const createDtoWithoutStatus = { ...createDto };
      delete createDtoWithoutStatus.status;

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockEmailTemplate);
      repository.save.mockResolvedValue(mockEmailTemplate);

      await service.create(createDtoWithoutStatus, 'user-1');

      expect(repository.create).toHaveBeenCalledWith({
        ...createDtoWithoutStatus,
        createdBy: 'user-1',
        status: EmailTemplateStatus.DRAFT,
      });
    });
  });

  describe('update', () => {
    const updateDto: UpdateEmailTemplateDto = {
      name: 'Updated Template',
      subject: 'Updated Subject',
    };

    it('should update email template successfully', async () => {
      const updatedTemplate = {
        ...mockEmailTemplate,
        ...updateDto,
        updatedBy: 'user-2',
      };

      repository.findOneBy.mockResolvedValue(mockEmailTemplate);
      repository.findOne.mockResolvedValue(null);
      repository.save.mockResolvedValue(updatedTemplate);

      const result = await service.update('template-1', updateDto, 'user-2');

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'template-1' });
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockEmailTemplate,
          ...updateDto,
          updatedBy: 'user-2',
        }),
      );
      expect(result).toEqual(updatedTemplate);
    });

    it('should throw NotFoundException if template not found', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('template-1', updateDto, 'user-2'),
      ).rejects.toThrow(NotFoundException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if name/type conflict exists', async () => {
      const conflictingTemplate = { ...mockEmailTemplate, id: 'template-2' };

      repository.findOneBy.mockResolvedValue(mockEmailTemplate);
      repository.findOne.mockResolvedValue(conflictingTemplate);

      await expect(
        service.update('template-1', updateDto, 'user-2'),
      ).rejects.toThrow(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findByType', () => {
    it('should find templates by type', async () => {
      const templates = [mockEmailTemplate];
      repository.find.mockResolvedValue(templates);

      const result = await service.findByType(
        EmailTemplateType.APPLICATION_RECEIVED,
        'company-1',
      );

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          type: EmailTemplateType.APPLICATION_RECEIVED,
          companyProfileId: 'company-1',
          status: EmailTemplateStatus.ACTIVE,
        },
        relations: ['companyProfile', 'creator'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(templates);
    });

    it('should find templates by type without company filter', async () => {
      const templates = [mockEmailTemplate];
      repository.find.mockResolvedValue(templates);

      await service.findByType(EmailTemplateType.APPLICATION_RECEIVED);

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          type: EmailTemplateType.APPLICATION_RECEIVED,
          companyProfileId: null,
          status: EmailTemplateStatus.ACTIVE,
        },
        relations: ['companyProfile', 'creator'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findByCompany', () => {
    it('should find templates by company', async () => {
      const templates = [mockEmailTemplate];
      repository.find.mockResolvedValue(templates);

      const result = await service.findByCompany('company-1');

      expect(repository.find).toHaveBeenCalledWith({
        where: { companyProfileId: 'company-1' },
        relations: ['creator', 'updater'],
        order: { type: 'ASC', createdAt: 'DESC' },
      });
      expect(result).toEqual(templates);
    });
  });

  describe('findGlobalTemplates', () => {
    it('should find global templates', async () => {
      const globalTemplate = { ...mockEmailTemplate, companyProfileId: null };
      const templates = [globalTemplate];
      repository.find.mockResolvedValue(templates);

      const result = await service.findGlobalTemplates();

      expect(repository.find).toHaveBeenCalledWith({
        where: { companyProfileId: null },
        relations: ['creator', 'updater'],
        order: { type: 'ASC', createdAt: 'DESC' },
      });
      expect(result).toEqual(templates);
    });
  });

  describe('activate', () => {
    it('should activate template successfully', async () => {
      const activatedTemplate = {
        ...mockEmailTemplate,
        status: EmailTemplateStatus.ACTIVE,
        updatedBy: 'user-2',
      };

      repository.findOneBy.mockResolvedValue(mockEmailTemplate);
      repository.save.mockResolvedValue(activatedTemplate);

      const result = await service.activate('template-1', 'user-2');

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'template-1' });
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockEmailTemplate,
          status: EmailTemplateStatus.ACTIVE,
          updatedBy: 'user-2',
        }),
      );
      expect(result).toEqual(activatedTemplate);
    });

    it('should throw NotFoundException if template not found', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.activate('template-1', 'user-2')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('should deactivate template successfully', async () => {
      const deactivatedTemplate = {
        ...mockEmailTemplate,
        status: EmailTemplateStatus.INACTIVE,
        updatedBy: 'user-2',
      };

      repository.findOneBy.mockResolvedValue(mockEmailTemplate);
      repository.save.mockResolvedValue(deactivatedTemplate);

      const result = await service.deactivate('template-1', 'user-2');

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'template-1' });
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockEmailTemplate,
          status: EmailTemplateStatus.INACTIVE,
          updatedBy: 'user-2',
        }),
      );
      expect(result).toEqual(deactivatedTemplate);
    });
  });

  describe('duplicate', () => {
    it('should duplicate template successfully', async () => {
      const duplicatedTemplate = {
        ...mockEmailTemplate,
        id: 'template-2',
        name: 'Duplicated Template',
        status: EmailTemplateStatus.DRAFT,
        description: 'Copy of Welcome Email',
        createdBy: 'user-2',
      };

      repository.findOneBy.mockResolvedValue(mockEmailTemplate);
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(duplicatedTemplate);
      repository.save.mockResolvedValue(duplicatedTemplate);

      const result = await service.duplicate(
        'template-1',
        'Duplicated Template',
        'user-2',
      );

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'template-1' });
      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          name: 'Duplicated Template',
          type: mockEmailTemplate.type,
          companyProfileId: mockEmailTemplate.companyProfileId,
        },
      });
      expect(repository.create).toHaveBeenCalledWith({
        name: 'Duplicated Template',
        type: mockEmailTemplate.type,
        subject: mockEmailTemplate.subject,
        htmlContent: mockEmailTemplate.htmlContent,
        textContent: mockEmailTemplate.textContent,
        status: EmailTemplateStatus.DRAFT,
        mergeFields: mockEmailTemplate.mergeFields,
        description: 'Copy of Welcome Email',
        companyProfileId: mockEmailTemplate.companyProfileId,
        createdBy: 'user-2',
      });
      expect(result).toEqual(duplicatedTemplate);
    });

    it('should throw NotFoundException if original template not found', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(
        service.duplicate('template-1', 'New Name', 'user-2'),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if duplicate name exists', async () => {
      repository.findOneBy.mockResolvedValue(mockEmailTemplate);
      repository.findOne.mockResolvedValue(mockEmailTemplate);

      await expect(
        service.duplicate('template-1', 'Existing Name', 'user-2'),
      ).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('getAvailableMergeFields', () => {
    it('should return available merge fields', async () => {
      const result = await service.getAvailableMergeFields();

      expect(result).toEqual([
        'candidate.firstName',
        'candidate.lastName',
        'candidate.email',
        'candidate.phone',
        'candidate.location',
        'job.title',
        'job.company',
        'job.location',
        'job.workArrangement',
        'company.name',
        'company.website',
        'application.appliedAt',
        'application.status',
        'recruiter.firstName',
        'recruiter.lastName',
        'recruiter.email',
        'currentDate',
        'currentTime',
      ]);
    });
  });
});
