import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import {
  EmailSendingService,
  SendEmailOptions,
} from '../email-sending.service';
import { EmailService, EmailResult } from '../email.service';
import { EmailLog, EmailStatus } from '../../../entities/email-log.entity';

describe('EmailSendingService', () => {
  let service: EmailSendingService;
  let emailLogRepository: Repository<EmailLog>;
  let emailService: EmailService;
  let emailQueue: Queue;

  const mockEmailLog: EmailLog = {
    id: '1',
    to: 'test@example.com',
    subject: 'Test Subject',
    htmlContent: '<p>Test content</p>',
    status: EmailStatus.PENDING,
    sentBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as EmailLog;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailSendingService,
        {
          provide: getRepositoryToken(EmailLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn(),
          },
        },
        {
          provide: getQueueToken('email'),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailSendingService>(EmailSendingService);
    emailLogRepository = module.get<Repository<EmailLog>>(
      getRepositoryToken(EmailLog),
    );
    emailService = module.get<EmailService>(EmailService);
    emailQueue = module.get<Queue>(getQueueToken('email'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should create email log and queue email for sending', async () => {
      const options: SendEmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        htmlContent: '<p>Test content</p>',
        sentBy: 'user1',
      };

      jest.spyOn(emailLogRepository, 'create').mockReturnValue(mockEmailLog);
      jest.spyOn(emailLogRepository, 'save').mockResolvedValue(mockEmailLog);
      jest.spyOn(emailQueue, 'add').mockResolvedValue({} as any);

      const result = await service.sendEmail(options);

      expect(result).toBe('1');
      expect(emailLogRepository.create).toHaveBeenCalledWith({
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        htmlContent: options.htmlContent,
        textContent: options.textContent,
        status: EmailStatus.PENDING,
        emailTemplateId: options.templateId,
        candidateId: options.candidateId,
        applicationId: options.applicationId,
        sentBy: options.sentBy,
        metadata: options.metadata,
      });
      expect(emailQueue.add).toHaveBeenCalledWith(
        'send-email',
        { emailLogId: '1' },
        expect.objectContaining({
          priority: 5,
          attempts: 3,
        }),
      );
    });

    it('should schedule email for later sending', async () => {
      const scheduledFor = new Date(Date.now() + 3600000); // 1 hour from now
      const options: SendEmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        htmlContent: '<p>Test content</p>',
        sentBy: 'user1',
        scheduledFor,
      };

      jest.spyOn(emailLogRepository, 'create').mockReturnValue(mockEmailLog);
      jest.spyOn(emailLogRepository, 'save').mockResolvedValue(mockEmailLog);
      jest.spyOn(emailQueue, 'add').mockResolvedValue({} as any);

      await service.sendEmail(options);

      expect(emailQueue.add).toHaveBeenCalledWith(
        'send-email',
        { emailLogId: '1' },
        expect.objectContaining({
          delay: expect.any(Number),
          priority: 5,
        }),
      );
    });
  });

  describe('sendBulkEmails', () => {
    it('should process emails in batches', async () => {
      const emails: SendEmailOptions[] = Array.from({ length: 25 }, (_, i) => ({
        to: `test${i}@example.com`,
        subject: `Test Subject ${i}`,
        htmlContent: `<p>Test content ${i}</p>`,
        sentBy: 'user1',
      }));

      const mockLogs = emails.map((_, i) => ({
        ...mockEmailLog,
        id: `${i + 1}`,
      }));

      jest
        .spyOn(emailLogRepository, 'create')
        .mockImplementation((data) => data as EmailLog);
      jest
        .spyOn(emailLogRepository, 'save')
        .mockImplementation((logs) =>
          Promise.resolve(Array.isArray(logs) ? logs : [logs]),
        );
      jest.spyOn(emailQueue, 'add').mockResolvedValue({} as any);

      const result = await service.sendBulkEmails({
        emails,
        batchSize: 10,
        delayBetweenBatches: 1000,
      });

      expect(result).toHaveLength(25);
      expect(emailLogRepository.save).toHaveBeenCalledTimes(3); // 3 batches
      expect(emailQueue.add).toHaveBeenCalledTimes(25);
    });
  });

  describe('processEmailSending', () => {
    it('should send email and update status on success', async () => {
      const emailResult: EmailResult = {
        success: true,
        messageId: 'msg123',
      };

      jest.spyOn(emailLogRepository, 'findOne').mockResolvedValue(mockEmailLog);
      jest.spyOn(emailService, 'sendEmail').mockResolvedValue(emailResult);
      jest.spyOn(emailLogRepository, 'update').mockResolvedValue({} as any);

      await service.processEmailSending('1');

      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: mockEmailLog.to,
        cc: undefined,
        bcc: undefined,
        subject: mockEmailLog.subject,
        html: mockEmailLog.htmlContent,
        text: undefined,
      });
      expect(emailLogRepository.update).toHaveBeenCalledWith('1', {
        status: EmailStatus.SENT,
        externalId: 'msg123',
        sentAt: expect.any(Date),
      });
    });

    it('should update status to failed on email sending failure', async () => {
      const emailResult: EmailResult = {
        success: false,
        error: 'SMTP error',
      };

      jest.spyOn(emailLogRepository, 'findOne').mockResolvedValue(mockEmailLog);
      jest.spyOn(emailService, 'sendEmail').mockResolvedValue(emailResult);
      jest.spyOn(emailLogRepository, 'update').mockResolvedValue({} as any);

      await service.processEmailSending('1');

      expect(emailLogRepository.update).toHaveBeenCalledWith('1', {
        status: EmailStatus.FAILED,
        errorMessage: 'SMTP error',
      });
    });

    it('should handle email log not found', async () => {
      jest.spyOn(emailLogRepository, 'findOne').mockResolvedValue(null);

      await service.processEmailSending('nonexistent');

      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle email log not in pending status', async () => {
      const sentEmailLog = { ...mockEmailLog, status: EmailStatus.SENT };
      jest.spyOn(emailLogRepository, 'findOne').mockResolvedValue(sentEmailLog);

      await service.processEmailSending('1');

      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should update delivery status with timestamp', async () => {
      const timestamp = new Date();
      jest.spyOn(emailLogRepository, 'update').mockResolvedValue({} as any);

      await service.updateDeliveryStatus('1', EmailStatus.DELIVERED, timestamp);

      expect(emailLogRepository.update).toHaveBeenCalledWith('1', {
        status: EmailStatus.DELIVERED,
        deliveredAt: timestamp,
      });
    });

    it('should update opened status', async () => {
      const timestamp = new Date();
      jest.spyOn(emailLogRepository, 'update').mockResolvedValue({} as any);

      await service.updateDeliveryStatus('1', EmailStatus.OPENED, timestamp);

      expect(emailLogRepository.update).toHaveBeenCalledWith('1', {
        status: EmailStatus.OPENED,
        openedAt: timestamp,
      });
    });

    it('should update bounced status with error message', async () => {
      const timestamp = new Date();
      const errorMessage = 'Email bounced';
      jest.spyOn(emailLogRepository, 'update').mockResolvedValue({} as any);

      await service.updateDeliveryStatus(
        '1',
        EmailStatus.BOUNCED,
        timestamp,
        errorMessage,
      );

      expect(emailLogRepository.update).toHaveBeenCalledWith('1', {
        status: EmailStatus.BOUNCED,
        bouncedAt: timestamp,
        errorMessage,
      });
    });
  });

  describe('getDeliveryStatus', () => {
    it('should return delivery status', async () => {
      const emailLog = {
        ...mockEmailLog,
        status: EmailStatus.DELIVERED,
        sentAt: new Date(),
        deliveredAt: new Date(),
      };

      jest.spyOn(emailLogRepository, 'findOne').mockResolvedValue(emailLog);

      const result = await service.getDeliveryStatus('1');

      expect(result).toEqual({
        id: '1',
        status: EmailStatus.DELIVERED,
        sentAt: emailLog.sentAt,
        deliveredAt: emailLog.deliveredAt,
        openedAt: emailLog.openedAt,
        clickedAt: emailLog.clickedAt,
        bouncedAt: emailLog.bouncedAt,
        errorMessage: emailLog.errorMessage,
      });
    });

    it('should return null for non-existent email log', async () => {
      jest.spyOn(emailLogRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getDeliveryStatus('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('retryFailedEmail', () => {
    it('should retry failed email', async () => {
      const failedEmailLog = { ...mockEmailLog, status: EmailStatus.FAILED };
      jest
        .spyOn(emailLogRepository, 'findOne')
        .mockResolvedValue(failedEmailLog);
      jest.spyOn(emailLogRepository, 'update').mockResolvedValue({} as any);
      jest.spyOn(emailQueue, 'add').mockResolvedValue({} as any);

      await service.retryFailedEmail('1');

      expect(emailLogRepository.update).toHaveBeenCalledWith('1', {
        status: EmailStatus.PENDING,
        errorMessage: null,
      });
      expect(emailQueue.add).toHaveBeenCalledWith(
        'send-email',
        { emailLogId: '1' },
        expect.objectContaining({
          priority: 10, // high priority
        }),
      );
    });

    it('should throw error for non-existent email log', async () => {
      jest.spyOn(emailLogRepository, 'findOne').mockResolvedValue(null);

      await expect(service.retryFailedEmail('nonexistent')).rejects.toThrow(
        'Email log with ID nonexistent not found',
      );
    });

    it('should throw error for non-failed email', async () => {
      const sentEmailLog = { ...mockEmailLog, status: EmailStatus.SENT };
      jest.spyOn(emailLogRepository, 'findOne').mockResolvedValue(sentEmailLog);

      await expect(service.retryFailedEmail('1')).rejects.toThrow(
        'Email 1 is not in failed status',
      );
    });
  });

  describe('getPriorityValue', () => {
    it('should return correct priority values', () => {
      expect(service['getPriorityValue']('high')).toBe(10);
      expect(service['getPriorityValue']('normal')).toBe(5);
      expect(service['getPriorityValue']('low')).toBe(1);
      expect(service['getPriorityValue'](undefined)).toBe(5);
    });
  });
});
