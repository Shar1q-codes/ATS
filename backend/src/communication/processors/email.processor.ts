import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { EmailSendingService } from '../services/email-sending.service';

export interface EmailJobData {
  emailLogId: string;
}

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private emailSendingService: EmailSendingService) {}

  @Process('send-email')
  async handleSendEmail(job: Job<EmailJobData>) {
    const { emailLogId } = job.data;

    this.logger.log(`Processing email job for email log ID: ${emailLogId}`);

    try {
      await this.emailSendingService.processEmailSending(emailLogId);
      this.logger.log(
        `Successfully processed email job for email log ID: ${emailLogId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process email job for email log ID: ${emailLogId}`,
        error,
      );
      throw error;
    }
  }
}
