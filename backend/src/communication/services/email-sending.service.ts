import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { EmailLog, EmailStatus } from '../../entities/email-log.entity';
import { EmailService, EmailOptions, EmailResult } from './email.service';
import { ComposedEmail } from './email-composition.service';

export interface SendEmailOptions extends ComposedEmail {
  candidateId?: string;
  applicationId?: string;
  sentBy: string;
  metadata?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  scheduledFor?: Date;
}

export interface BulkEmailOptions {
  emails: SendEmailOptions[];
  batchSize?: number;
  delayBetweenBatches?: number;
  priority?: 'low' | 'normal' | 'high';
}

export interface EmailDeliveryStatus {
  id: string;
  status: EmailStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  errorMessage?: string;
}

@Injectable()
export class EmailSendingService {
  private readonly logger = new Logger(EmailSendingService.name);

  constructor(
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
    private emailService: EmailService,
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  async sendEmail(options: SendEmailOptions): Promise<string> {
    // Create email log entry
    const emailLog = this.emailLogRepository.create({
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

    const savedLog = await this.emailLogRepository.save(emailLog);

    // If scheduled for later, add to queue with delay
    if (options.scheduledFor && options.scheduledFor > new Date()) {
      const delay = options.scheduledFor.getTime() - Date.now();
      await this.emailQueue.add(
        'send-email',
        { emailLogId: savedLog.id },
        {
          delay,
          priority: this.getPriorityValue(options.priority),
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
    } else {
      // Send immediately via queue
      await this.emailQueue.add(
        'send-email',
        { emailLogId: savedLog.id },
        {
          priority: this.getPriorityValue(options.priority),
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
    }

    return savedLog.id;
  }

  async sendBulkEmails(options: BulkEmailOptions): Promise<string[]> {
    const {
      emails,
      batchSize = 10,
      delayBetweenBatches = 1000,
      priority = 'normal',
    } = options;
    const emailLogIds: string[] = [];

    // Process emails in batches
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      // Create email log entries for the batch
      const emailLogs = batch.map((email) =>
        this.emailLogRepository.create({
          to: email.to,
          cc: email.cc,
          bcc: email.bcc,
          subject: email.subject,
          htmlContent: email.htmlContent,
          textContent: email.textContent,
          status: EmailStatus.PENDING,
          emailTemplateId: email.templateId,
          candidateId: email.candidateId,
          applicationId: email.applicationId,
          sentBy: email.sentBy,
          metadata: email.metadata,
        }),
      );

      const savedLogs = await this.emailLogRepository.save(emailLogs);
      emailLogIds.push(...savedLogs.map((log) => log.id));

      // Add batch to queue
      const batchDelay = i > 0 ? delayBetweenBatches * (i / batchSize) : 0;

      for (const log of savedLogs) {
        await this.emailQueue.add(
          'send-email',
          { emailLogId: log.id },
          {
            delay: batchDelay,
            priority: this.getPriorityValue(priority),
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        );
      }
    }

    this.logger.log(`Queued ${emailLogIds.length} emails for bulk sending`);
    return emailLogIds;
  }

  async processEmailSending(emailLogId: string): Promise<void> {
    const emailLog = await this.emailLogRepository.findOne({
      where: { id: emailLogId },
    });

    if (!emailLog) {
      this.logger.error(`Email log with ID ${emailLogId} not found`);
      return;
    }

    if (emailLog.status !== EmailStatus.PENDING) {
      this.logger.warn(`Email log ${emailLogId} is not in pending status`);
      return;
    }

    try {
      const emailOptions: EmailOptions = {
        to: emailLog.to,
        cc: emailLog.cc || undefined,
        bcc: emailLog.bcc || undefined,
        subject: emailLog.subject,
        html: emailLog.htmlContent,
        text: emailLog.textContent || undefined,
      };

      const result: EmailResult =
        await this.emailService.sendEmail(emailOptions);

      if (result.success) {
        await this.emailLogRepository.update(emailLogId, {
          status: EmailStatus.SENT,
          externalId: result.messageId,
          sentAt: new Date(),
        });

        this.logger.log(`Email ${emailLogId} sent successfully`);
      } else {
        await this.emailLogRepository.update(emailLogId, {
          status: EmailStatus.FAILED,
          errorMessage: result.error,
        });

        this.logger.error(
          `Failed to send email ${emailLogId}: ${result.error}`,
        );
      }
    } catch (error) {
      await this.emailLogRepository.update(emailLogId, {
        status: EmailStatus.FAILED,
        errorMessage: error.message,
      });

      this.logger.error(`Error processing email ${emailLogId}:`, error);
      throw error;
    }
  }

  async updateDeliveryStatus(
    emailLogId: string,
    status: EmailStatus,
    timestamp?: Date,
    errorMessage?: string,
  ): Promise<void> {
    const updateData: Partial<EmailLog> = {
      status,
    };

    const now = timestamp || new Date();

    switch (status) {
      case EmailStatus.DELIVERED:
        updateData.deliveredAt = now;
        break;
      case EmailStatus.OPENED:
        updateData.openedAt = now;
        break;
      case EmailStatus.CLICKED:
        updateData.clickedAt = now;
        break;
      case EmailStatus.BOUNCED:
        updateData.bouncedAt = now;
        updateData.errorMessage = errorMessage;
        break;
      case EmailStatus.FAILED:
        updateData.errorMessage = errorMessage;
        break;
    }

    await this.emailLogRepository.update(emailLogId, updateData);
    this.logger.log(`Updated email ${emailLogId} status to ${status}`);
  }

  async getDeliveryStatus(
    emailLogId: string,
  ): Promise<EmailDeliveryStatus | null> {
    const emailLog = await this.emailLogRepository.findOne({
      where: { id: emailLogId },
    });

    if (!emailLog) {
      return null;
    }

    return {
      id: emailLog.id,
      status: emailLog.status,
      sentAt: emailLog.sentAt,
      deliveredAt: emailLog.deliveredAt,
      openedAt: emailLog.openedAt,
      clickedAt: emailLog.clickedAt,
      bouncedAt: emailLog.bouncedAt,
      errorMessage: emailLog.errorMessage,
    };
  }

  async getEmailHistory(
    candidateId?: string,
    applicationId?: string,
    limit = 50,
    offset = 0,
  ): Promise<{ emails: EmailLog[]; total: number }> {
    const queryBuilder = this.emailLogRepository
      .createQueryBuilder('email_log')
      .leftJoinAndSelect('email_log.emailTemplate', 'template')
      .leftJoinAndSelect('email_log.candidate', 'candidate')
      .leftJoinAndSelect('email_log.application', 'application')
      .leftJoinAndSelect('email_log.sender', 'sender');

    if (candidateId) {
      queryBuilder.andWhere('email_log.candidateId = :candidateId', {
        candidateId,
      });
    }

    if (applicationId) {
      queryBuilder.andWhere('email_log.applicationId = :applicationId', {
        applicationId,
      });
    }

    const [emails, total] = await queryBuilder
      .orderBy('email_log.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return { emails, total };
  }

  async retryFailedEmail(emailLogId: string): Promise<void> {
    const emailLog = await this.emailLogRepository.findOne({
      where: { id: emailLogId },
    });

    if (!emailLog) {
      throw new Error(`Email log with ID ${emailLogId} not found`);
    }

    if (emailLog.status !== EmailStatus.FAILED) {
      throw new Error(`Email ${emailLogId} is not in failed status`);
    }

    // Reset status to pending
    await this.emailLogRepository.update(emailLogId, {
      status: EmailStatus.PENDING,
      errorMessage: null,
    });

    // Add back to queue
    await this.emailQueue.add(
      'send-email',
      { emailLogId },
      {
        priority: this.getPriorityValue('high'),
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    this.logger.log(`Retrying failed email ${emailLogId}`);
  }

  private getPriorityValue(priority?: 'low' | 'normal' | 'high'): number {
    switch (priority) {
      case 'high':
        return 10;
      case 'normal':
        return 5;
      case 'low':
        return 1;
      default:
        return 5;
    }
  }
}
