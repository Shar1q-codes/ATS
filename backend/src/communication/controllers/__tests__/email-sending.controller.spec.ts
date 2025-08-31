import { Test, TestingModule } from '@nestjs/testing';
import { EmailSendingController } from '../email-sending.controller';
import { EmailSendingService } from '../../services/email-sending.service';
import { SendEmailDto, BulkEmailDto, UpdateDeliveryStatusDto } from '../../dto';
import { EmailStatus } from '../../../entities/email-log.entity';
import { User, UserRole } from '../../../entities/user.entity';

describe('EmailSendingController', () => {
  let controller: EmailSendingController;
  let emailSendingService: EmailSendingService;

  const mockUser: User = {
    id: 'user1',
    email: 'recruiter@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    role: UserRole.RECRUITER,
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailSendingController],
      providers: [
        {
          provide: EmailSendingService,
          useValue: {
            sendEmail: jest.fn(),
            sendBulkEmails: jest.fn(),
            getDeliveryStatus: jest.fn(),
            updateDeliveryStatus: jest.fn(),
            getEmailHistory: jest.fn(),
            retryFailedEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EmailSendingController>(EmailSendingController);
    emailSendingService = module.get<EmailSendingService>(EmailSendingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const dto: SendEmailDto = {
        to: 'test@example.com',
        subject: 'Test Subject',
        htmlContent: '<p>Test content</p>',
        priority: 'normal',
      };

      jest
        .spyOn(emailSendingService, 'sendEmail')
        .mockResolvedValue('email-log-1');

      const req = { user: mockUser };
      const result = await controller.sendEmail(dto, req);

      expect(emailSendingService.sendEmail).toHaveBeenCalledWith({
        ...dto,
        sentBy: 'user1',
        scheduledFor: undefined,
      });
      expect(result).toEqual({
        id: 'email-log-1',
        success: true,
      });
    });

    it('should handle scheduled email', async () => {
      const scheduledFor = new Date(Date.now() + 3600000).toISOString();
      const dto: SendEmailDto = {
        to: 'test@example.com',
        subject: 'Test Subject',
        htmlContent: '<p>Test content</p>',
        scheduledFor,
      };

      jest
        .spyOn(emailSendingService, 'sendEmail')
        .mockResolvedValue('email-log-1');

      const req = { user: mockUser };
      await controller.sendEmail(dto, req);

      expect(emailSendingService.sendEmail).toHaveBeenCalledWith({
        ...dto,
        sentBy: 'user1',
        scheduledFor: new Date(scheduledFor),
      });
    });

    it('should handle email sending error', async () => {
      const dto: SendEmailDto = {
        to: 'test@example.com',
        subject: 'Test Subject',
        htmlContent: '<p>Test content</p>',
      };

      jest
        .spyOn(emailSendingService, 'sendEmail')
        .mockRejectedValue(new Error('Sending failed'));

      const req = { user: mockUser };
      const result = await controller.sendEmail(dto, req);

      expect(result).toEqual({
        id: '',
        success: false,
        message: 'Sending failed',
      });
    });
  });

  describe('sendBulkEmails', () => {
    it('should send bulk emails successfully', async () => {
      const dto: BulkEmailDto = {
        emails: [
          {
            to: 'test1@example.com',
            subject: 'Test Subject 1',
            htmlContent: '<p>Test content 1</p>',
          },
          {
            to: 'test2@example.com',
            subject: 'Test Subject 2',
            htmlContent: '<p>Test content 2</p>',
          },
        ],
        batchSize: 10,
        priority: 'normal',
      };

      jest
        .spyOn(emailSendingService, 'sendBulkEmails')
        .mockResolvedValue(['email-1', 'email-2']);

      const req = { user: mockUser };
      const result = await controller.sendBulkEmails(dto, req);

      expect(emailSendingService.sendBulkEmails).toHaveBeenCalledWith({
        ...dto,
        emails: dto.emails.map((email) => ({
          ...email,
          sentBy: 'user1',
          scheduledFor: undefined,
        })),
      });
      expect(result).toEqual({
        emailIds: ['email-1', 'email-2'],
        totalQueued: 2,
        success: true,
      });
    });

    it('should handle bulk email sending error', async () => {
      const dto: BulkEmailDto = {
        emails: [
          {
            to: 'test@example.com',
            subject: 'Test Subject',
            htmlContent: '<p>Test content</p>',
          },
        ],
      };

      jest
        .spyOn(emailSendingService, 'sendBulkEmails')
        .mockRejectedValue(new Error('Bulk sending failed'));

      const req = { user: mockUser };
      const result = await controller.sendBulkEmails(dto, req);

      expect(result).toEqual({
        emailIds: [],
        totalQueued: 0,
        success: false,
      });
    });
  });

  describe('getDeliveryStatus', () => {
    it('should return delivery status', async () => {
      const mockStatus = {
        id: 'email-1',
        status: EmailStatus.DELIVERED,
        sentAt: new Date(),
        deliveredAt: new Date(),
      };

      jest
        .spyOn(emailSendingService, 'getDeliveryStatus')
        .mockResolvedValue(mockStatus);

      const result = await controller.getDeliveryStatus('email-1');

      expect(emailSendingService.getDeliveryStatus).toHaveBeenCalledWith(
        'email-1',
      );
      expect(result).toEqual(mockStatus);
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should update delivery status successfully', async () => {
      const dto: UpdateDeliveryStatusDto = {
        status: 'delivered',
        timestamp: new Date().toISOString(),
      };

      jest
        .spyOn(emailSendingService, 'updateDeliveryStatus')
        .mockResolvedValue();

      const result = await controller.updateDeliveryStatus('email-1', dto);

      expect(emailSendingService.updateDeliveryStatus).toHaveBeenCalledWith(
        'email-1',
        'delivered',
        new Date(dto.timestamp),
        undefined,
      );
      expect(result).toEqual({ success: true });
    });

    it('should handle update delivery status error', async () => {
      const dto: UpdateDeliveryStatusDto = {
        status: 'failed',
        errorMessage: 'Delivery failed',
      };

      jest
        .spyOn(emailSendingService, 'updateDeliveryStatus')
        .mockRejectedValue(new Error('Update failed'));

      const result = await controller.updateDeliveryStatus('email-1', dto);

      expect(result).toEqual({ success: false });
    });
  });

  describe('getEmailHistory', () => {
    it('should return email history', async () => {
      const mockHistory = {
        emails: [],
        total: 0,
      };

      jest
        .spyOn(emailSendingService, 'getEmailHistory')
        .mockResolvedValue(mockHistory);

      const result = await controller.getEmailHistory(
        'candidate-1',
        'app-1',
        25,
        10,
      );

      expect(emailSendingService.getEmailHistory).toHaveBeenCalledWith(
        'candidate-1',
        'app-1',
        25,
        10,
      );
      expect(result).toEqual({
        ...mockHistory,
        limit: 25,
        offset: 10,
      });
    });

    it('should use default pagination values', async () => {
      const mockHistory = {
        emails: [],
        total: 0,
      };

      jest
        .spyOn(emailSendingService, 'getEmailHistory')
        .mockResolvedValue(mockHistory);

      const result = await controller.getEmailHistory();

      expect(emailSendingService.getEmailHistory).toHaveBeenCalledWith(
        undefined,
        undefined,
        50,
        0,
      );
      expect(result).toEqual({
        ...mockHistory,
        limit: 50,
        offset: 0,
      });
    });
  });

  describe('retryFailedEmail', () => {
    it('should retry failed email successfully', async () => {
      jest.spyOn(emailSendingService, 'retryFailedEmail').mockResolvedValue();

      const result = await controller.retryFailedEmail('email-1');

      expect(emailSendingService.retryFailedEmail).toHaveBeenCalledWith(
        'email-1',
      );
      expect(result).toEqual({ success: true });
    });

    it('should handle retry failed email error', async () => {
      jest
        .spyOn(emailSendingService, 'retryFailedEmail')
        .mockRejectedValue(new Error('Retry failed'));

      const result = await controller.retryFailedEmail('email-1');

      expect(result).toEqual({ success: false, message: 'Retry failed' });
    });
  });
});
