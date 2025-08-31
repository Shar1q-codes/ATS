import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import {
  EmailCompositionService,
  MergeFieldData,
} from '../email-composition.service';
import {
  EmailTemplate,
  EmailTemplateType,
  EmailTemplateStatus,
} from '../../../entities/email-template.entity';
import { Candidate } from '../../../entities/candidate.entity';
import { Application } from '../../../entities/application.entity';
import { CompanyProfile } from '../../../entities/company-profile.entity';
import { User, UserRole } from '../../../entities/user.entity';

describe('EmailCompositionService', () => {
  let service: EmailCompositionService;
  let emailTemplateRepository: Repository<EmailTemplate>;

  const mockEmailTemplate: EmailTemplate = {
    id: '1',
    name: 'Application Received',
    type: EmailTemplateType.APPLICATION_RECEIVED,
    subject: 'Thank you for your application, {{candidate.firstName}}!',
    htmlContent:
      '<p>Dear {{candidate.fullName}},</p><p>Thank you for applying to {{company.name}}.</p>',
    textContent:
      'Dear {{candidate.fullName}}, Thank you for applying to {{company.name}}.',
    status: EmailTemplateStatus.ACTIVE,
    mergeFields: ['candidate.firstName', 'candidate.fullName', 'company.name'],
    companyProfileId: '1',
    createdBy: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as EmailTemplate;

  const mockCandidate: Candidate = {
    id: '1',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    location: 'New York, NY',
    consentGiven: true,
    consentDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Candidate;

  const mockCompany: CompanyProfile = {
    id: '1',
    name: 'Tech Corp',
    industry: 'Technology',
    size: 'medium',
    location: 'San Francisco, CA',
    workArrangement: 'hybrid',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as CompanyProfile;

  const mockUser: User = {
    id: '1',
    email: 'recruiter@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    role: UserRole.RECRUITER,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailCompositionService,
        {
          provide: getRepositoryToken(EmailTemplate),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailCompositionService>(EmailCompositionService);
    emailTemplateRepository = module.get<Repository<EmailTemplate>>(
      getRepositoryToken(EmailTemplate),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('composeFromTemplate', () => {
    it('should compose email from template with merge fields', async () => {
      jest
        .spyOn(emailTemplateRepository, 'findOne')
        .mockResolvedValue(mockEmailTemplate);

      const mergeData: MergeFieldData = {
        candidate: mockCandidate,
        company: mockCompany,
        user: mockUser,
      };

      const result = await service.composeFromTemplate('1', mergeData);

      expect(result).toEqual({
        to: 'john.doe@example.com',
        subject: 'Thank you for your application, John!',
        htmlContent:
          '<p>Dear John Doe,</p><p>Thank you for applying to Tech Corp.</p>',
        textContent: 'Dear John Doe, Thank you for applying to Tech Corp.',
        templateId: '1',
      });
    });

    it('should use provided recipient email over candidate email', async () => {
      jest
        .spyOn(emailTemplateRepository, 'findOne')
        .mockResolvedValue(mockEmailTemplate);

      const mergeData: MergeFieldData = {
        candidate: mockCandidate,
        company: mockCompany,
      };

      const result = await service.composeFromTemplate(
        '1',
        mergeData,
        'custom@example.com',
      );

      expect(result.to).toBe('custom@example.com');
    });

    it('should throw NotFoundException when template not found', async () => {
      jest.spyOn(emailTemplateRepository, 'findOne').mockResolvedValue(null);

      const mergeData: MergeFieldData = {
        candidate: mockCandidate,
      };

      await expect(
        service.composeFromTemplate('nonexistent', mergeData),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error when no recipient email available', async () => {
      jest
        .spyOn(emailTemplateRepository, 'findOne')
        .mockResolvedValue(mockEmailTemplate);

      const mergeData: MergeFieldData = {
        company: mockCompany,
      };

      await expect(service.composeFromTemplate('1', mergeData)).rejects.toThrow(
        'Recipient email is required',
      );
    });
  });

  describe('composeCustomEmail', () => {
    it('should compose custom email with merge fields', async () => {
      const mergeData: MergeFieldData = {
        candidate: mockCandidate,
        company: mockCompany,
        customFields: { jobTitle: 'Software Engineer' },
      };

      const result = await service.composeCustomEmail(
        'test@example.com',
        'Hello {{candidate.firstName}} - {{jobTitle}} Position',
        '<p>Dear {{candidate.fullName}}, Welcome to {{company.name}}!</p>',
        'Dear {{candidate.fullName}}, Welcome to {{company.name}}!',
        mergeData,
      );

      expect(result).toEqual({
        to: 'test@example.com',
        subject: 'Hello John - Software Engineer Position',
        htmlContent: '<p>Dear John Doe, Welcome to Tech Corp!</p>',
        textContent: 'Dear John Doe, Welcome to Tech Corp!',
      });
    });

    it('should compose custom email without merge fields', async () => {
      const result = await service.composeCustomEmail(
        'test@example.com',
        'Static Subject',
        '<p>Static content</p>',
        'Static content',
      );

      expect(result).toEqual({
        to: 'test@example.com',
        subject: 'Static Subject',
        htmlContent: '<p>Static content</p>',
        textContent: 'Static content',
      });
    });
  });

  describe('replaceMergeFields', () => {
    it('should replace candidate merge fields', () => {
      const content = 'Hello {{candidate.firstName}} {{candidate.lastName}}!';
      const mergeData: MergeFieldData = { candidate: mockCandidate };

      const result = service['replaceMergeFields'](content, mergeData);

      expect(result).toBe('Hello John Doe!');
    });

    it('should replace company merge fields', () => {
      const content = 'Welcome to {{company.name}} in {{company.location}}!';
      const mergeData: MergeFieldData = { company: mockCompany };

      const result = service['replaceMergeFields'](content, mergeData);

      expect(result).toBe('Welcome to Tech Corp in San Francisco, CA!');
    });

    it('should replace user merge fields', () => {
      const content = 'Best regards, {{user.fullName}} ({{user.email}})';
      const mergeData: MergeFieldData = { user: mockUser };

      const result = service['replaceMergeFields'](content, mergeData);

      expect(result).toBe('Best regards, Jane Smith (recruiter@example.com)');
    });

    it('should replace custom merge fields', () => {
      const content = 'Position: {{jobTitle}}, Salary: {{salary}}';
      const mergeData: MergeFieldData = {
        customFields: { jobTitle: 'Software Engineer', salary: '$100,000' },
      };

      const result = service['replaceMergeFields'](content, mergeData);

      expect(result).toBe('Position: Software Engineer, Salary: $100,000');
    });

    it('should replace common merge fields', () => {
      const content = 'Date: {{currentDate}}, Year: {{currentYear}}';
      const mergeData: MergeFieldData = {};

      const result = service['replaceMergeFields'](content, mergeData);

      expect(result).toContain(new Date().getFullYear().toString());
      expect(result).toContain(new Date().toLocaleDateString());
    });

    it('should handle missing merge data gracefully', () => {
      const content = 'Hello {{candidate.firstName}}!';
      const mergeData: MergeFieldData = {};

      const result = service['replaceMergeFields'](content, mergeData);

      expect(result).toBe('Hello !');
    });
  });

  describe('getAvailableMergeFields', () => {
    it('should return all available merge fields', () => {
      const result = service.getAvailableMergeFields();

      expect(result).toHaveProperty('candidate');
      expect(result).toHaveProperty('application');
      expect(result).toHaveProperty('company');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('common');
      expect(result.candidate).toContain('candidate.firstName');
      expect(result.common).toContain('currentDate');
    });
  });

  describe('validateMergeFields', () => {
    it('should validate correct merge fields', () => {
      const content = 'Hello {{candidate.firstName}} from {{company.name}}!';

      const result = service.validateMergeFields(content);

      expect(result.valid).toBe(true);
      expect(result.invalidFields).toEqual([]);
    });

    it('should identify invalid merge fields', () => {
      const content = 'Hello {{candidate.invalidField}} and {{unknown.field}}!';

      const result = service.validateMergeFields(content);

      expect(result.valid).toBe(false);
      expect(result.invalidFields).toEqual([
        'candidate.invalidField',
        'unknown.field',
      ]);
    });

    it('should handle content without merge fields', () => {
      const content = 'Hello world!';

      const result = service.validateMergeFields(content);

      expect(result.valid).toBe(true);
      expect(result.invalidFields).toEqual([]);
    });
  });
});
