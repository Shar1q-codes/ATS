import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService, EmailOptions } from '../email.service';
import * as nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(),
}));
const mockNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

describe('EmailService', () => {
  let service: EmailService;
  let configService: jest.Mocked<ConfigService>;
  let mockTransporter: any;

  beforeEach(async () => {
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn(),
    };

    mockNodemailer.createTransporter.mockReturnValue(mockTransporter);

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with SMTP provider by default', () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            EMAIL_PROVIDER: 'smtp',
            SMTP_HOST: 'localhost',
            SMTP_PORT: 587,
            SMTP_SECURE: false,
            SMTP_USER: 'test@example.com',
            SMTP_PASS: 'password',
          };
          return config.hasOwnProperty(key) ? config[key] : defaultValue;
        },
      );

      new EmailService(configService);

      expect(mockNodemailer.createTransporter).toHaveBeenCalledWith({
        host: 'localhost',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'password',
        },
      });
    });

    it('should initialize with Postmark provider', () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            EMAIL_PROVIDER: 'postmark',
            POSTMARK_API_TOKEN: 'test-token',
          };
          return config.hasOwnProperty(key) ? config[key] : defaultValue;
        },
      );

      new EmailService(configService);

      expect(mockNodemailer.createTransporter).toHaveBeenCalledWith({
        service: 'Postmark',
        auth: {
          user: 'test-token',
          pass: 'test-token',
        },
      });
    });

    it('should initialize with SendGrid provider', () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            EMAIL_PROVIDER: 'sendgrid',
            SENDGRID_API_KEY: 'test-api-key',
          };
          return config.hasOwnProperty(key) ? config[key] : defaultValue;
        },
      );

      new EmailService(configService);

      expect(mockNodemailer.createTransporter).toHaveBeenCalledWith({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: 'test-api-key',
        },
      });
    });
  });

  describe('sendEmail', () => {
    beforeEach(() => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            EMAIL_PROVIDER: 'smtp',
            EMAIL_FROM: 'noreply@test.com',
          };
          return config.hasOwnProperty(key) ? config[key] : defaultValue;
        },
      );
    });

    it('should send email successfully', async () => {
      const mockResult = { messageId: 'test-message-id' };
      mockTransporter.sendMail.mockResolvedValue(mockResult);

      const emailOptions: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML content</p>',
        text: 'Test text content',
      };

      const result = await service.sendEmail(emailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@test.com',
        to: 'test@example.com',
        cc: undefined,
        bcc: undefined,
        subject: 'Test Subject',
        html: '<p>Test HTML content</p>',
        text: 'Test text content',
        attachments: undefined,
      });

      expect(result).toEqual({
        success: true,
        messageId: 'test-message-id',
      });
    });

    it('should handle multiple recipients', async () => {
      const mockResult = { messageId: 'test-message-id' };
      mockTransporter.sendMail.mockResolvedValue(mockResult);

      const emailOptions: EmailOptions = {
        to: ['test1@example.com', 'test2@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        subject: 'Test Subject',
        html: '<p>Test HTML content</p>',
      };

      await service.sendEmail(emailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@test.com',
        to: 'test1@example.com, test2@example.com',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML content</p>',
        text: undefined,
        attachments: undefined,
      });
    });

    it('should handle email sending failure', async () => {
      const error = new Error('SMTP connection failed');
      mockTransporter.sendMail.mockRejectedValue(error);

      const emailOptions: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML content</p>',
      };

      const result = await service.sendEmail(emailOptions);

      expect(result).toEqual({
        success: false,
        error: 'SMTP connection failed',
      });
    });
  });

  describe('sendBulkEmails', () => {
    beforeEach(() => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            EMAIL_PROVIDER: 'smtp',
            EMAIL_FROM: 'noreply@test.com',
          };
          return config.hasOwnProperty(key) ? config[key] : defaultValue;
        },
      );

      // Mock setTimeout to avoid delays in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should send multiple emails successfully', async () => {
      const mockResult = { messageId: 'test-message-id' };
      mockTransporter.sendMail.mockResolvedValue(mockResult);

      const emails: EmailOptions[] = [
        {
          to: 'test1@example.com',
          subject: 'Test Subject 1',
          html: '<p>Test HTML content 1</p>',
        },
        {
          to: 'test2@example.com',
          subject: 'Test Subject 2',
          html: '<p>Test HTML content 2</p>',
        },
      ];

      const results = await service.sendBulkEmails(emails);

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        success: true,
        messageId: 'test-message-id',
      });
      expect(results[1]).toEqual({
        success: true,
        messageId: 'test-message-id',
      });
    });

    it('should handle mixed success and failure results', async () => {
      mockTransporter.sendMail
        .mockResolvedValueOnce({ messageId: 'success-id' })
        .mockRejectedValueOnce(new Error('Failed to send'));

      const emails: EmailOptions[] = [
        {
          to: 'success@example.com',
          subject: 'Success Email',
          html: '<p>Success content</p>',
        },
        {
          to: 'fail@example.com',
          subject: 'Fail Email',
          html: '<p>Fail content</p>',
        },
      ];

      const results = await service.sendBulkEmails(emails);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ success: true, messageId: 'success-id' });
      expect(results[1]).toEqual({ success: false, error: 'Failed to send' });
    });
  });

  describe('verifyConnection', () => {
    it('should verify connection successfully', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await service.verifyConnection();

      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle connection verification failure', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      const result = await service.verifyConnection();

      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
});
