import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: any[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailProvider = this.configService.get<string>(
      'EMAIL_PROVIDER',
      'smtp',
    );

    switch (emailProvider.toLowerCase()) {
      case 'postmark':
        this.transporter = nodemailer.createTransport({
          service: 'Postmark',
          auth: {
            user: this.configService.get<string>('POSTMARK_API_TOKEN'),
            pass: this.configService.get<string>('POSTMARK_API_TOKEN'),
          },
        });
        break;

      case 'sendgrid':
        this.transporter = nodemailer.createTransport({
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: this.configService.get<string>('SENDGRID_API_KEY'),
          },
        });
        break;

      default:
        // Default SMTP configuration
        this.transporter = nodemailer.createTransport({
          host: this.configService.get<string>('SMTP_HOST', 'localhost'),
          port: this.configService.get<number>('SMTP_PORT', 587),
          secure: this.configService.get<boolean>('SMTP_SECURE', false),
          auth: {
            user: this.configService.get<string>('SMTP_USER'),
            pass: this.configService.get<string>('SMTP_PASS'),
          },
        });
    }

    this.logger.log(
      `Email service initialized with provider: ${emailProvider}`,
    );
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const mailOptions = {
        from:
          this.configService.get<string>('EMAIL_FROM') ||
          this.configService.get<string>('SMTP_FROM') ||
          'noreply@ai-native-ats.com',
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc
          ? Array.isArray(options.cc)
            ? options.cc.join(', ')
            : options.cc
          : undefined,
        bcc: options.bcc
          ? Array.isArray(options.bcc)
            ? options.bcc.join(', ')
            : options.bcc
          : undefined,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);

      this.logger.log(
        `Email sent successfully to ${options.to}. Message ID: ${result.messageId}`,
      );

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendBulkEmails(emails: EmailOptions[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push(result);

      // Add a small delay between emails to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email service connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Email service connection verification failed:', error);
      return false;
    }
  }
}
