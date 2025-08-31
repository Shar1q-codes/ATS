import { Test, TestingModule } from '@nestjs/testing';
import { EmailCompositionController } from '../email-composition.controller';
import {
  EmailCompositionService,
  MergeFieldData,
} from '../../services/email-composition.service';
import { CandidateService } from '../../../candidates/services/candidate.service';
import { ApplicationService } from '../../../applications/services/application.service';
import { CompanyProfileService } from '../../../jobs/services/company-profile.service';
import { ComposeFromTemplateDto, ComposeCustomEmailDto } from '../../dto';
import { Candidate } from '../../../entities/candidate.entity';
import { Application } from '../../../entities/application.entity';
import { CompanyProfile } from '../../../entities/company-profile.entity';
import { User, UserRole } from '../../../entities/user.entity';

describe('EmailCompositionController', () => {
  let controller: EmailCompositionController;
  let emailCompositionService: EmailCompositionService;
  let candidateService: CandidateService;
  let applicationService: ApplicationService;
  let companyProfileService: CompanyProfileService;

  const mockUser: User = {
    id: 'user1',
    email: 'recruiter@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    role: UserRole.RECRUITER,
  } as User;

  const mockCandidate: Candidate = {
    id: 'candidate1',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
  } as Candidate;

  const mockApplication: Application = {
    id: 'app1',
    candidateId: 'candidate1',
    status: 'applied',
  } as Application;

  const mockCompany: CompanyProfile = {
    id: 'company1',
    name: 'Tech Corp',
    industry: 'Technology',
  } as CompanyProfile;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailCompositionController],
      providers: [
        {
          provide: EmailCompositionService,
          useValue: {
            composeFromTemplate: jest.fn(),
            composeCustomEmail: jest.fn(),
            getAvailableMergeFields: jest.fn(),
            validateMergeFields: jest.fn(),
          },
        },
        {
          provide: CandidateService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ApplicationService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: CompanyProfileService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EmailCompositionController>(
      EmailCompositionController,
    );
    emailCompositionService = module.get<EmailCompositionService>(
      EmailCompositionService,
    );
    candidateService = module.get<CandidateService>(CandidateService);
    applicationService = module.get<ApplicationService>(ApplicationService);
    companyProfileService = module.get<CompanyProfileService>(
      CompanyProfileService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('composeFromTemplate', () => {
    it('should compose email from template with all merge data', async () => {
      const dto: ComposeFromTemplateDto = {
        templateId: 'template1',
        candidateId: 'candidate1',
        applicationId: 'app1',
        companyProfileId: 'company1',
        customFields: { jobTitle: 'Software Engineer' },
      };

      const expectedComposedEmail = {
        to: 'john.doe@example.com',
        subject: 'Test Subject',
        htmlContent: '<p>Test content</p>',
        templateId: 'template1',
      };

      jest.spyOn(candidateService, 'findOne').mockResolvedValue(mockCandidate);
      jest
        .spyOn(applicationService, 'findOne')
        .mockResolvedValue(mockApplication);
      jest
        .spyOn(companyProfileService, 'findOne')
        .mockResolvedValue(mockCompany);
      jest
        .spyOn(emailCompositionService, 'composeFromTemplate')
        .mockResolvedValue(expectedComposedEmail);

      const req = { user: mockUser };
      const result = await controller.composeFromTemplate(dto, req);

      expect(candidateService.findOne).toHaveBeenCalledWith('candidate1');
      expect(applicationService.findOne).toHaveBeenCalledWith('app1');
      expect(companyProfileService.findOne).toHaveBeenCalledWith('company1');
      expect(emailCompositionService.composeFromTemplate).toHaveBeenCalledWith(
        'template1',
        {
          user: mockUser,
          candidate: mockCandidate,
          application: mockApplication,
          company: mockCompany,
          customFields: { jobTitle: 'Software Engineer' },
        },
        undefined,
      );
      expect(result).toEqual(expectedComposedEmail);
    });

    it('should load candidate from application if not provided', async () => {
      const dto: ComposeFromTemplateDto = {
        templateId: 'template1',
        applicationId: 'app1',
      };

      jest
        .spyOn(applicationService, 'findOne')
        .mockResolvedValue(mockApplication);
      jest.spyOn(candidateService, 'findOne').mockResolvedValue(mockCandidate);
      jest
        .spyOn(emailCompositionService, 'composeFromTemplate')
        .mockResolvedValue({} as any);

      const req = { user: mockUser };
      await controller.composeFromTemplate(dto, req);

      expect(candidateService.findOne).toHaveBeenCalledWith('candidate1');
    });

    it('should use recipient email override', async () => {
      const dto: ComposeFromTemplateDto = {
        templateId: 'template1',
        recipientEmail: 'override@example.com',
      };

      jest
        .spyOn(emailCompositionService, 'composeFromTemplate')
        .mockResolvedValue({} as any);

      const req = { user: mockUser };
      await controller.composeFromTemplate(dto, req);

      expect(emailCompositionService.composeFromTemplate).toHaveBeenCalledWith(
        'template1',
        expect.objectContaining({ user: mockUser }),
        'override@example.com',
      );
    });
  });

  describe('composeCustomEmail', () => {
    it('should compose custom email with merge data', async () => {
      const dto: ComposeCustomEmailDto = {
        to: 'test@example.com',
        subject: 'Custom Subject',
        htmlContent: '<p>Custom content</p>',
        textContent: 'Custom content',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
        candidateId: 'candidate1',
      };

      const expectedComposedEmail = {
        to: 'test@example.com',
        subject: 'Custom Subject',
        htmlContent: '<p>Custom content</p>',
        textContent: 'Custom content',
      };

      jest.spyOn(candidateService, 'findOne').mockResolvedValue(mockCandidate);
      jest
        .spyOn(emailCompositionService, 'composeCustomEmail')
        .mockResolvedValue(expectedComposedEmail);

      const req = { user: mockUser };
      const result = await controller.composeCustomEmail(dto, req);

      expect(candidateService.findOne).toHaveBeenCalledWith('candidate1');
      expect(emailCompositionService.composeCustomEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Custom Subject',
        '<p>Custom content</p>',
        'Custom content',
        {
          user: mockUser,
          candidate: mockCandidate,
          customFields: undefined,
        },
      );
      expect(result).toEqual({
        ...expectedComposedEmail,
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
      });
    });
  });

  describe('getMergeFields', () => {
    it('should return available merge fields', async () => {
      const mockFields = {
        candidate: ['candidate.firstName', 'candidate.lastName'],
        company: ['company.name'],
      };

      jest
        .spyOn(emailCompositionService, 'getAvailableMergeFields')
        .mockReturnValue(mockFields);

      const result = await controller.getMergeFields();

      expect(result).toEqual({ fields: mockFields });
    });
  });

  describe('validateMergeFields', () => {
    it('should validate merge fields', async () => {
      const body = { content: 'Hello {{candidate.firstName}}!' };
      const mockValidation = { valid: true, invalidFields: [] };

      jest
        .spyOn(emailCompositionService, 'validateMergeFields')
        .mockReturnValue(mockValidation);

      const result = await controller.validateMergeFields(body);

      expect(emailCompositionService.validateMergeFields).toHaveBeenCalledWith(
        'Hello {{candidate.firstName}}!',
      );
      expect(result).toEqual(mockValidation);
    });
  });
});
