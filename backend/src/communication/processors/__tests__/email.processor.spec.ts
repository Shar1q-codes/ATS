import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { EmailProcessor, EmailJobData } from '../email.processor';
import { EmailSendingService } from '../../services/email-sending.service';

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let emailSendingService: EmailSendingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessor,
        {
          provide: EmailSendingService,
          useValue: {
            processEmailSending: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);
    emailSendingService = module.get<EmailSendingService>(EmailSendingService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleSendEmail', () => {
    it('should process email sending job successfully', async () => {
      const jobData: EmailJobData = {
        emailLogId: 'email-log-1',
      };

      const mockJob = {
        data: jobData,
      } as Job<EmailJobData>;

      jest
        .spyOn(emailSendingService, 'processEmailSending')
        .mockResolvedValue();

      await processor.handleSendEmail(mockJob);

      expect(emailSendingService.processEmailSending).toHaveBeenCalledWith(
        'email-log-1',
      );
    });

    it('should throw error when email sending fails', async () => {
      const jobData: EmailJobData = {
        emailLogId: 'email-log-1',
      };

      const mockJob = {
        data: jobData,
      } as Job<EmailJobData>;

      const error = new Error('Email sending failed');
      jest
        .spyOn(emailSendingService, 'processEmailSending')
        .mockRejectedValue(error);

      await expect(processor.handleSendEmail(mockJob)).rejects.toThrow(
        'Email sending failed',
      );
      expect(emailSendingService.processEmailSending).toHaveBeenCalledWith(
        'email-log-1',
      );
    });
  });
});
