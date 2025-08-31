import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Application,
  PipelineStage,
  EmailTemplate,
  EmailTemplateType,
} from '../../entities';
import { EmailSendingService } from './email-sending.service';
import { EmailCompositionService } from './email-composition.service';
import { CommunicationHistoryService } from './communication-history.service';
import { CandidateCommunicationPreferencesService } from './candidate-communication-preferences.service';
import { CommunicationDirection } from '../../entities/communication-history.entity';

@Injectable()
export class AutomatedCommunicationService {
  private readonly logger = new Logger(AutomatedCommunicationService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(EmailTemplate)
    private readonly emailTemplateRepository: Repository<EmailTemplate>,
    private readonly emailSendingService: EmailSendingService,
    private readonly emailCompositionService: EmailCompositionService,
    private readonly communicationHistoryService: CommunicationHistoryService,
    private readonly preferencesService: CandidateCommunicationPreferencesService,
  ) {}

  async handleApplicationStatusChange(
    applicationId: string,
    fromStage: PipelineStage,
    toStage: PipelineStage,
    changedBy: string,
  ): Promise<void> {
    try {
      const application = await this.applicationRepository.findOne({
        where: { id: applicationId },
        relations: [
          'candidate',
          'companyJobVariant',
          'companyJobVariant.companyProfile',
        ],
      });

      if (!application) {
        this.logger.warn(`Application ${applicationId} not found`);
        return;
      }

      // Check if candidate can receive application updates
      const canSendUpdate =
        await this.preferencesService.shouldSendApplicationUpdate(
          application.candidateId,
        );

      if (!canSendUpdate) {
        this.logger.log(
          `Skipping automated email for candidate ${application.candidateId} - opted out of application updates`,
        );
        return;
      }

      // Check if candidate can receive emails
      const canSendEmail = await this.preferencesService.canSendCommunication(
        application.candidateId,
        'email',
      );

      if (!canSendEmail) {
        this.logger.log(
          `Skipping automated email for candidate ${application.candidateId} - email disabled`,
        );
        return;
      }

      // Find appropriate email template for the stage transition
      const emailTemplate = await this.findEmailTemplateForStage(toStage);

      if (!emailTemplate) {
        this.logger.warn(`No email template found for stage ${toStage}`);
        return;
      }

      // Compose the email
      const mergeFields = this.buildMergeFields(application);
      const composedEmail = await this.emailCompositionService.composeEmail({
        templateId: emailTemplate.id,
        mergeFields,
      });

      // Send the email
      const emailResult = await this.emailSendingService.sendEmail({
        to: application.candidate.email,
        subject: composedEmail.subject,
        htmlContent: composedEmail.htmlContent,
        textContent: composedEmail.textContent,
        candidateId: application.candidateId,
        applicationId: application.id,
        templateId: emailTemplate.id,
      });

      // Log the communication in history
      await this.communicationHistoryService.logEmailCommunication(
        application.candidateId,
        composedEmail.subject,
        composedEmail.htmlContent,
        CommunicationDirection.OUTBOUND,
        application.id,
        changedBy,
        emailResult.id,
        undefined, // fromAddress will be set by email service
        application.candidate.email,
      );

      this.logger.log(
        `Automated email sent for application ${applicationId} stage change: ${fromStage} -> ${toStage}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send automated email for application ${applicationId}:`,
        error.stack,
      );
    }
  }

  async sendInterviewReminder(
    applicationId: string,
    interviewDate: Date,
    interviewDetails: {
      location?: string;
      meetingLink?: string;
      interviewerName?: string;
      interviewerEmail?: string;
      duration?: number;
      notes?: string;
    },
  ): Promise<void> {
    try {
      const application = await this.applicationRepository.findOne({
        where: { id: applicationId },
        relations: [
          'candidate',
          'companyJobVariant',
          'companyJobVariant.companyProfile',
        ],
      });

      if (!application) {
        this.logger.warn(`Application ${applicationId} not found`);
        return;
      }

      // Check if candidate can receive interview reminders
      const canSendReminder =
        await this.preferencesService.shouldSendInterviewReminder(
          application.candidateId,
        );

      if (!canSendReminder) {
        this.logger.log(
          `Skipping interview reminder for candidate ${application.candidateId} - opted out`,
        );
        return;
      }

      // Find interview reminder template
      const emailTemplate = await this.emailTemplateRepository.findOne({
        where: { type: EmailTemplateType.INTERVIEW_REMINDER },
      });

      if (!emailTemplate) {
        this.logger.warn('No interview reminder email template found');
        return;
      }

      // Build merge fields with interview details
      const mergeFields = {
        ...this.buildMergeFields(application),
        interviewDate: interviewDate.toLocaleDateString(),
        interviewTime: interviewDate.toLocaleTimeString(),
        interviewLocation: interviewDetails.location || 'TBD',
        meetingLink: interviewDetails.meetingLink || '',
        interviewerName: interviewDetails.interviewerName || 'Hiring Team',
        interviewerEmail: interviewDetails.interviewerEmail || '',
        duration: interviewDetails.duration
          ? `${interviewDetails.duration} minutes`
          : '60 minutes',
        notes: interviewDetails.notes || '',
      };

      // Compose and send the email
      const composedEmail = await this.emailCompositionService.composeEmail({
        templateId: emailTemplate.id,
        mergeFields,
      });

      const emailResult = await this.emailSendingService.sendEmail({
        to: application.candidate.email,
        subject: composedEmail.subject,
        htmlContent: composedEmail.htmlContent,
        textContent: composedEmail.textContent,
        candidateId: application.candidateId,
        applicationId: application.id,
        templateId: emailTemplate.id,
      });

      // Log the communication
      await this.communicationHistoryService.logEmailCommunication(
        application.candidateId,
        composedEmail.subject,
        composedEmail.htmlContent,
        CommunicationDirection.OUTBOUND,
        application.id,
        undefined, // system-generated
        emailResult.id,
        undefined,
        application.candidate.email,
      );

      this.logger.log(
        `Interview reminder sent for application ${applicationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send interview reminder for application ${applicationId}:`,
        error.stack,
      );
    }
  }

  private async findEmailTemplateForStage(
    stage: PipelineStage,
  ): Promise<EmailTemplate | null> {
    const templateTypeMap: Record<PipelineStage, EmailTemplateType> = {
      [PipelineStage.APPLIED]: EmailTemplateType.APPLICATION_RECEIVED,
      [PipelineStage.SCREENING]: EmailTemplateType.APPLICATION_UNDER_REVIEW,
      [PipelineStage.SHORTLISTED]: EmailTemplateType.APPLICATION_SHORTLISTED,
      [PipelineStage.INTERVIEW_SCHEDULED]:
        EmailTemplateType.INTERVIEW_SCHEDULED,
      [PipelineStage.INTERVIEW_COMPLETED]:
        EmailTemplateType.INTERVIEW_COMPLETED,
      [PipelineStage.OFFER_EXTENDED]: EmailTemplateType.OFFER_EXTENDED,
      [PipelineStage.OFFER_ACCEPTED]: EmailTemplateType.OFFER_ACCEPTED,
      [PipelineStage.HIRED]: EmailTemplateType.WELCOME,
      [PipelineStage.REJECTED]: EmailTemplateType.APPLICATION_REJECTED,
    };

    const templateType = templateTypeMap[stage];
    if (!templateType) {
      return null;
    }

    return await this.emailTemplateRepository.findOne({
      where: { type: templateType },
    });
  }

  private buildMergeFields(application: any): Record<string, string> {
    return {
      candidateFirstName: application.candidate.firstName,
      candidateLastName: application.candidate.lastName,
      candidateFullName: `${application.candidate.firstName} ${application.candidate.lastName}`,
      candidateEmail: application.candidate.email,
      jobTitle: application.companyJobVariant?.customTitle || 'Position',
      companyName:
        application.companyJobVariant?.companyProfile?.name || 'Company',
      applicationDate: application.appliedAt?.toLocaleDateString() || '',
      fitScore: application.fitScore?.toString() || '0',
    };
  }
}
