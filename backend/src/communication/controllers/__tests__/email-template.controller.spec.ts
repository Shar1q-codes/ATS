import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EmailTemplateController } from '../email-template.controller';
import { EmailTemplateService } from '../../services/email-template.service';
import {
  EmailTemplate,
  EmailTemplateType,
  EmailTemplateStatus,
} from '../../../entities';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto } from '../../dto';

describe('EmailTemplateController', () => {
  let controller: EmailTemplateController;
  let service: jest.Mocked<EmailTemplateService>;

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

  const mockUser = { id: 'user-1', email: 'test@example.com' };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByType: jest.fn(),
      findByCompany: jest.fn(),
      findGlobalTemplates: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      duplicate: jest.fn(),
      delete: jest.fn(),
      getAvailableMergeFields: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailTemplateController],
      providers: [
        {
          provide: EmailTemplateService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<EmailTemplateController>(EmailTemplateController);
    service = module.get(EmailTemplateService);
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
    };

    it('should create email template successfully', async () => {
      service.create.mockResolvedValue(mockEmailTemplate);

      const result = await controller.create(createDto, { user: mockUser });

      expect(service.create).toHaveBeenCalledWith(createDto, mockUser.id);
      expect(result).toEqual({
        success: true,
        data: mockEmailTemplate,
        message: 'Email template created successfully',
      });
    });

    it('should handle ConflictException', async () => {
      service.create.mockRejectedValue(
        new ConflictException('Template already exists'),
      );

      await expect(
        controller.create(createDto, { user: mockUser }),
      ).rejects.toThrow(ConflictException);
      expect(service.create).toHaveBeenCalledWith(createDto, mockUser.id);
    });
  });

  describe('findAll', () => {
    it('should find all templates without filters', async () => {
      const templates = [mockEmailTemplate];
      service.findAll.mockResolvedValue(templates);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith({
        relations: ['companyProfile', 'creator', 'updater'],
        order: { type: 'ASC', createdAt: 'DESC' },
      });
      expect(result).toEqual({
        success: true,
        data: templates,
        message: 'Email templates retrieved successfully',
      });
    });

    it('should find templates by company', async () => {
      const templates = [mockEmailTemplate];
      service.findByCompany.mockResolvedValue(templates);

      const result = await controller.findAll('company-1');

      expect(service.findByCompany).toHaveBeenCalledWith('company-1');
      expect(result).toEqual({
        success: true,
        data: templates,
        message: 'Email templates retrieved successfully',
      });
    });

    it('should find templates by type', async () => {
      const templates = [mockEmailTemplate];
      service.findByType.mockResolvedValue(templates);

      const result = await controller.findAll(
        undefined,
        EmailTemplateType.APPLICATION_RECEIVED,
      );

      expect(service.findByType).toHaveBeenCalledWith(
        EmailTemplateType.APPLICATION_RECEIVED,
        undefined,
      );
      expect(result).toEqual({
        success: true,
        data: templates,
        message: 'Email templates retrieved successfully',
      });
    });

    it('should find templates by type and company', async () => {
      const templates = [mockEmailTemplate];
      service.findByType.mockResolvedValue(templates);

      const result = await controller.findAll(
        'company-1',
        EmailTemplateType.APPLICATION_RECEIVED,
      );

      expect(service.findByType).toHaveBeenCalledWith(
        EmailTemplateType.APPLICATION_RECEIVED,
        'company-1',
      );
      expect(result).toEqual({
        success: true,
        data: templates,
        message: 'Email templates retrieved successfully',
      });
    });
  });

  describe('findGlobalTemplates', () => {
    it('should find global templates', async () => {
      const templates = [mockEmailTemplate];
      service.findGlobalTemplates.mockResolvedValue(templates);

      const result = await controller.findGlobalTemplates();

      expect(service.findGlobalTemplates).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        data: templates,
        message: 'Global email templates retrieved successfully',
      });
    });
  });

  describe('getAvailableMergeFields', () => {
    it('should get available merge fields', async () => {
      const mergeFields = ['candidate.firstName', 'candidate.lastName'];
      service.getAvailableMergeFields.mockResolvedValue(mergeFields);

      const result = await controller.getAvailableMergeFields();

      expect(service.getAvailableMergeFields).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        data: mergeFields,
        message: 'Merge fields retrieved successfully',
      });
    });
  });

  describe('findOne', () => {
    it('should find template by ID', async () => {
      service.findById.mockResolvedValue(mockEmailTemplate);

      const result = await controller.findOne('template-1');

      expect(service.findById).toHaveBeenCalledWith('template-1', {
        relations: ['companyProfile', 'creator', 'updater'],
      });
      expect(result).toEqual({
        success: true,
        data: mockEmailTemplate,
        message: 'Email template retrieved successfully',
      });
    });
  });

  describe('update', () => {
    const updateDto: UpdateEmailTemplateDto = {
      name: 'Updated Template',
      subject: 'Updated Subject',
    };

    it('should update template successfully', async () => {
      const updatedTemplate = { ...mockEmailTemplate, ...updateDto };
      service.update.mockResolvedValue(updatedTemplate);

      const result = await controller.update('template-1', updateDto, {
        user: mockUser,
      });

      expect(service.update).toHaveBeenCalledWith(
        'template-1',
        updateDto,
        mockUser.id,
      );
      expect(result).toEqual({
        success: true,
        data: updatedTemplate,
        message: 'Email template updated successfully',
      });
    });

    it('should handle NotFoundException', async () => {
      service.update.mockRejectedValue(
        new NotFoundException('Template not found'),
      );

      await expect(
        controller.update('template-1', updateDto, { user: mockUser }),
      ).rejects.toThrow(NotFoundException);
      expect(service.update).toHaveBeenCalledWith(
        'template-1',
        updateDto,
        mockUser.id,
      );
    });
  });

  describe('activate', () => {
    it('should activate template successfully', async () => {
      const activatedTemplate = {
        ...mockEmailTemplate,
        status: EmailTemplateStatus.ACTIVE,
      };
      service.activate.mockResolvedValue(activatedTemplate);

      const result = await controller.activate('template-1', {
        user: mockUser,
      });

      expect(service.activate).toHaveBeenCalledWith('template-1', mockUser.id);
      expect(result).toEqual({
        success: true,
        data: activatedTemplate,
        message: 'Email template activated successfully',
      });
    });
  });

  describe('deactivate', () => {
    it('should deactivate template successfully', async () => {
      const deactivatedTemplate = {
        ...mockEmailTemplate,
        status: EmailTemplateStatus.INACTIVE,
      };
      service.deactivate.mockResolvedValue(deactivatedTemplate);

      const result = await controller.deactivate('template-1', {
        user: mockUser,
      });

      expect(service.deactivate).toHaveBeenCalledWith(
        'template-1',
        mockUser.id,
      );
      expect(result).toEqual({
        success: true,
        data: deactivatedTemplate,
        message: 'Email template deactivated successfully',
      });
    });
  });

  describe('duplicate', () => {
    it('should duplicate template successfully', async () => {
      const duplicatedTemplate = {
        ...mockEmailTemplate,
        id: 'template-2',
        name: 'Duplicated Template',
      };
      service.duplicate.mockResolvedValue(duplicatedTemplate);

      const result = await controller.duplicate(
        'template-1',
        'Duplicated Template',
        { user: mockUser },
      );

      expect(service.duplicate).toHaveBeenCalledWith(
        'template-1',
        'Duplicated Template',
        mockUser.id,
      );
      expect(result).toEqual({
        success: true,
        data: duplicatedTemplate,
        message: 'Email template duplicated successfully',
      });
    });

    it('should handle ConflictException for duplicate name', async () => {
      service.duplicate.mockRejectedValue(
        new ConflictException('Template with name already exists'),
      );

      await expect(
        controller.duplicate('template-1', 'Existing Name', { user: mockUser }),
      ).rejects.toThrow(ConflictException);
      expect(service.duplicate).toHaveBeenCalledWith(
        'template-1',
        'Existing Name',
        mockUser.id,
      );
    });
  });

  describe('remove', () => {
    it('should delete template successfully', async () => {
      service.delete.mockResolvedValue(undefined);

      const result = await controller.remove('template-1');

      expect(service.delete).toHaveBeenCalledWith('template-1');
      expect(result).toEqual({
        success: true,
        data: null,
        message: 'Email template deleted successfully',
      });
    });
  });
});
