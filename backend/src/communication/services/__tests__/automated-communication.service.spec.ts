import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { AutomatedCommunicationService } from '../automated-communication.service';
import {
  Application,
  EmailTemplate,
  PipelineStage,
  EmailTemplateType,
} from '../../../entities';
import { EmailSendingService } from '../email-sending.service';
import { EmailCompositionService } from '../email-composition.service';
import { CommunicationHistoryService } from '../communication-history.service';
import { CandidateCommunicationPreferencesService } from '../candidate-communication-preferences.service';

describe('AutomatedCommunicationService', () => {
  let service: AutomatedCommunicationService;
  let applicationRepository: jest.Mocked<Repository<Application>>;
  let emailTemplateRepository: jest.Mocked<Repository<EmailTemplate>>;
  let emailSendingService: jest.Mocked<EmailSendingService>;
  let emailCompositionService: jest.Mocked<EmailCompositionService>;
  let communicationHistoryService: jest.Mocked<CommunicationHistoryService>;
  let preferencesService: jest.Mocked<CandidateCommunicationPreferencesService>;

  const mockApplication = {
    id: 'app-1',
    candidateId: 'candidate-1',
    appliedAt: new Date(),
    fitScore: 85,
    candidate: {
      id: 'candidate-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    },
    companyJobVariant: {
      customTitle: 'Senior Developer',
      companyProfile: {
        name: 'Tech Corp',
      },
    },
  };

  const mockEmailTemplate = {
    id: 'template-1',
    type: EmailTemplateType.APPLICATION_UNDER_REVIEW,
    subject: 'Application Under Review',
    htmlContent: '<p>Hello {{candidateFirstName}}</p>',
  };

  beforeEach(async () => {
    const mockApplicationRepository = {
      findOne: jest.fn(),
    };

    const mockEmailTemplateRepository = {
      findOne: jest.fn(),
    };

    const mockEmailSendingService = {
      sendEmail: jest.fn(),
    };

    const mockEmailCompositionService = {
      composeEmail: jest.fn(),
    };

    const mockCommunicationHistoryService = {
      logEmailCommunication: jest.fn(),
    };

    const mockPreferencesService = {
      shouldSendApplicationUpdate: jest.fn(),
      canSendCommunication: jest.fn(),
      shouldSendInterviewReminder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomatedCommunicationService,
        {
          provide: getRepositoryToken(Application),
          useValue: mockApplicationRepository,
        },
        {
          provide: getRepositoryToken(EmailTemplate),
          useValue: mockEmailTemplateRepository,
        },
        {
          provide: EmailSendingService,
          useValue: mockEmailSendingService,
        },
        {
          provide: EmailCompositionService,
          useValue: mockEmailCompositionService,
        },
        {
          provide: CommunicationHistoryService,
          useValue: mockCommunicationHistoryService,
        },
        {
          provide: CandidateCommunicationPreferencesService,
          useValue: mockPreferencesService,
        },
      ],
    }).compile();

    service = module.get<AutomatedCommunicationService>(
      AutomatedCommunicationService,
    );
    applicationRepository = module.get(getRepositoryToken(Application));
    emailTemplateRepository = module.get(getRepositoryToken(EmailTemplate));
    emailSendingService = module.get(EmailSendingService);
    emailCompositionService = module.get(EmailCompositionService);
    communicationHistoryService = module.get(CommunicationHistoryService);
    preferencesService = module.get(CandidateCommunicationPreferencesService);

    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleApplicationStatusChange', () => {
    it('should send automated email for status change', async () => {
      const composedEmail = {
        subject: 'Application Received',
        htmlContent: '<p>Hello John</p>',
        textContent: 'Hello John',
      };

      const emailResult = {
        id: 'email-log-1',
        status: 'sent',
      };

      applicationRepository.findOne.mockResolvedValue(mockApplication as any);
      preferencesService.shouldSendApplicationUpdate.mockResolvedValue(true);
      preferencesService.canSendCommunication.mockResolvedValue(true);
      emailTemplateRepository.findOne.mockResolvedValue(
        mockEmailTemplate as any,
      );
      emailCompositionService.composeEmail.mockResolvedValue(
        composedEmail as any,
      );
      emailSendingService.sendEmail.mockResolvedValue(emailResult as any);
      communicationHistoryService.logEmailCommunication.mockResolvedValue(
        {} as any,
      );

      await service.handleApplicationStatusChange(
        'app-1',
        PipelineStage.APPLIED,
        PipelineStage.SCREENING,
        'user-1',
      );

      expect(applicationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'app-1' },
        relations: [
          'candidate',
          'companyJobVariant',
          'companyJobVariant.companyProfile',
        ],
      });
      expect(
        preferencesService.shouldSendApplicationUpdate,
      ).toHaveBeenCalledWith('candidate-1');
      expect(preferencesService.canSendCommunication).toHaveBeenCalledWith(
        'candidate-1',
        'email',
      );
      expect(emailCompositionService.composeEmail).toHaveBeenCalled();
      expect(emailSendingService.sendEmail).toHaveBeenCalled();
      expect(
        communicationHistoryService.logEmailCommunication,
      ).toHaveBeenCalled();
    });

    it('should skip email if candidate opted out of application updates', async () => {
      applicationRepository.findOne.mockResolvedValue(mockApplication as any);
      preferencesService.shouldSendApplicationUpdate.mockResolvedValue(false);

      await service.handleApplicationStatusChange(
        'app-1',
        PipelineStage.APPLIED,
        PipelineStage.SCREENING,
        'user-1',
      );

      expect(emailCompositionService.composeEmail).not.toHaveBeenCalled();
      expect(emailSendingService.sendEmail).not.toHaveBeenCalled();
    });

    it('should skip email if candidate disabled email communication', async () => {
      applicationRepository.findOne.mockResolvedValue(mockApplication as any);
      preferencesService.shouldSendApplicationUpdate.mockResolvedValue(true);
      preferencesService.canSendCommunication.mockResolvedValue(false);

      await service.handleApplicationStatusChange(
        'app-1',
        PipelineStage.APPLIED,
        PipelineStage.SCREENING,
        'user-1',
      );

      expect(emailCompositionService.composeEmail).not.toHaveBeenCalled();
      expect(emailSendingService.sendEmail).not.toHaveBeenCalled();
    });

    it('should skip email if no template found', async () => {
      applicationRepository.findOne.mockResolvedValue(mockApplication as any);
      preferencesService.shouldSendApplicationUpdate.mockResolvedValue(true);
      preferencesService.canSendCommunication.mockResolvedValue(true);
      emailTemplateRepository.findOne.mockResolvedValue(null);

      await service.handleApplicationStatusChange(
        'app-1',
        PipelineStage.APPLIED,
        PipelineStage.SCREENING,
        'user-1',
      );

      expect(emailCompositionService.composeEmail).not.toHaveBeenCalled();
      expect(emailSendingService.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle application not found', async () => {
      applicationRepository.findOne.mockResolvedValue(null);

      await service.handleApplicationStatusChange(
        'app-1',
        PipelineStage.APPLIED,
        PipelineStage.SCREENING,
        'user-1',
      );

      expect(
        preferencesService.shouldSendApplicationUpdate,
      ).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      applicationRepository.findOne.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.handleApplicationStatusChange(
          'app-1',
          PipelineStage.APPLIED,
          PipelineStage.SCREENING,
          'user-1',
        ),
      ).resolves.not.toThrow();

      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('sendInterviewReminder', () => {
    it('should send interview reminder email', async () => {
      const interviewDate = new Date('2024-01-15T10:00:00Z');
      const interviewDetails = {
        location: 'Conference Room A',
        interviewerName: 'Jane Smith',
        duration: 60,
      };

      const composedEmail = {
        subject: 'Interview Reminder',
        htmlContent: '<p>Interview reminder</p>',
        textContent: 'Interview reminder',
      };

      const emailResult = {
        id: 'email-log-2',
        status: 'sent',
      };

      applicationRepository.findOne.mockResolvedValue(mockApplication as any);
      preferencesService.shouldSendInterviewReminder.mockResolvedValue(true);
      emailTemplateRepository.findOne.mockResolvedValue({
        ...mockEmailTemplate,
        type: EmailTemplateType.INTERVIEW_REMINDER,
      } as any);
      emailCompositionService.composeEmail.mockResolvedValue(
        composedEmail as any,
      );
      emailSendingService.sendEmail.mockResolvedValue(emailResult as any);
      communicationHistoryService.logEmailCommunication.mockResolvedValue(
        {} as any,
      );

      await service.sendInterviewReminder(
        'app-1',
        interviewDate,
        interviewDetails,
      );

      expect(emailCompositionService.composeEmail).toHaveBeenCalledWith({
        templateId: mockEmailTemplate.id,
        mergeFields: expect.objectContaining({
          candidateFirstName: 'John',
          interviewDate: expect.any(String),
          interviewTime: expect.any(String),
          interviewLocation: 'Conference Room A',
          interviewerName: 'Jane Smith',
          duration: '60 minutes',
        }),
      });
      expect(emailSendingService.sendEmail).toHaveBeenCalled();
      expect(
        communicationHistoryService.logEmailCommunication,
      ).toHaveBeenCalled();
    });

    it('should skip reminder if candidate opted out', async () => {
      const interviewDate = new Date();
      const interviewDetails = {};

      applicationRepository.findOne.mockResolvedValue(mockApplication as any);
      preferencesService.shouldSendInterviewReminder.mockResolvedValue(false);

      await service.sendInterviewReminder(
        'app-1',
        interviewDate,
        interviewDetails,
      );

      expect(emailCompositionService.composeEmail).not.toHaveBeenCalled();
      expect(emailSendingService.sendEmail).not.toHaveBeenCalled();
    });
  });
});
