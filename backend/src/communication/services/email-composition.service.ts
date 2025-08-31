import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from '../../entities/email-template.entity';
import { Candidate } from '../../entities/candidate.entity';
import { Application } from '../../entities/application.entity';
import { CompanyProfile } from '../../entities/company-profile.entity';
import { User } from '../../entities/user.entity';

export interface MergeFieldData {
  candidate?: Candidate;
  application?: Application;
  company?: CompanyProfile;
  user?: User;
  customFields?: Record<string, any>;
}

export interface ComposedEmail {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateId?: string;
}

@Injectable()
export class EmailCompositionService {
  private readonly logger = new Logger(EmailCompositionService.name);

  constructor(
    @InjectRepository(EmailTemplate)
    private emailTemplateRepository: Repository<EmailTemplate>,
  ) {}

  async composeFromTemplate(
    templateId: string,
    mergeData: MergeFieldData,
    recipientEmail?: string,
  ): Promise<ComposedEmail> {
    const template = await this.emailTemplateRepository.findOne({
      where: { id: templateId },
      relations: ['companyProfile'],
    });

    if (!template) {
      throw new NotFoundException(
        `Email template with ID ${templateId} not found`,
      );
    }

    const to = recipientEmail || mergeData.candidate?.email;
    if (!to) {
      throw new Error('Recipient email is required');
    }

    const subject = this.replaceMergeFields(template.subject, mergeData);
    const htmlContent = this.replaceMergeFields(
      template.htmlContent,
      mergeData,
    );
    const textContent = template.textContent
      ? this.replaceMergeFields(template.textContent, mergeData)
      : undefined;

    return {
      to,
      subject,
      htmlContent,
      textContent,
      templateId: template.id,
    };
  }

  composeCustomEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
    mergeData?: MergeFieldData,
  ): ComposedEmail {
    const processedSubject = mergeData
      ? this.replaceMergeFields(subject, mergeData)
      : subject;
    const processedHtmlContent = mergeData
      ? this.replaceMergeFields(htmlContent, mergeData)
      : htmlContent;
    const processedTextContent =
      textContent && mergeData
        ? this.replaceMergeFields(textContent, mergeData)
        : textContent;

    return {
      to,
      subject: processedSubject,
      htmlContent: processedHtmlContent,
      textContent: processedTextContent,
    };
  }

  private replaceMergeFields(
    content: string,
    mergeData: MergeFieldData,
  ): string {
    let processedContent = content;

    // Candidate merge fields
    const candidate = mergeData.candidate;
    processedContent = processedContent
      .replace(/\{\{candidate\.firstName\}\}/g, candidate?.firstName || '')
      .replace(/\{\{candidate\.lastName\}\}/g, candidate?.lastName || '')
      .replace(
        /\{\{candidate\.fullName\}\}/g,
        candidate
          ? `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim()
          : '',
      )
      .replace(/\{\{candidate\.email\}\}/g, candidate?.email || '')
      .replace(/\{\{candidate\.phone\}\}/g, candidate?.phone || '')
      .replace(/\{\{candidate\.location\}\}/g, candidate?.location || '');

    // Application merge fields
    const application = mergeData.application;
    processedContent = processedContent
      .replace(/\{\{application\.status\}\}/g, application?.status || '')
      .replace(
        /\{\{application\.fitScore\}\}/g,
        application?.fitScore?.toString() || '',
      )
      .replace(
        /\{\{application\.appliedAt\}\}/g,
        application?.appliedAt?.toLocaleDateString() || '',
      );

    // Company merge fields
    const company = mergeData.company;
    processedContent = processedContent
      .replace(/\{\{company\.name\}\}/g, company?.name || '')
      .replace(/\{\{company\.industry\}\}/g, company?.industry || '')
      .replace(/\{\{company\.location\}\}/g, company?.location || '')
      .replace(
        /\{\{company\.workArrangement\}\}/g,
        company?.workArrangement || '',
      );

    // User merge fields
    const user = mergeData.user;
    processedContent = processedContent
      .replace(/\{\{user\.firstName\}\}/g, user?.firstName || '')
      .replace(/\{\{user\.lastName\}\}/g, user?.lastName || '')
      .replace(
        /\{\{user\.fullName\}\}/g,
        user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
      )
      .replace(/\{\{user\.email\}\}/g, user?.email || '');

    // Custom merge fields
    if (mergeData.customFields) {
      Object.entries(mergeData.customFields).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processedContent = processedContent.replace(regex, String(value || ''));
      });
    }

    // Common merge fields
    processedContent = processedContent
      .replace(/\{\{currentDate\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{currentYear\}\}/g, new Date().getFullYear().toString());

    return processedContent;
  }

  getAvailableMergeFields(): Record<string, string[]> {
    return {
      candidate: [
        'candidate.firstName',
        'candidate.lastName',
        'candidate.fullName',
        'candidate.email',
        'candidate.phone',
        'candidate.location',
      ],
      application: [
        'application.status',
        'application.fitScore',
        'application.appliedAt',
      ],
      company: [
        'company.name',
        'company.industry',
        'company.location',
        'company.workArrangement',
      ],
      user: ['user.firstName', 'user.lastName', 'user.fullName', 'user.email'],
      common: ['currentDate', 'currentYear'],
    };
  }

  validateMergeFields(content: string): {
    valid: boolean;
    invalidFields: string[];
  } {
    const mergeFieldRegex = /\{\{([^}]+)\}\}/g;
    const availableFields = this.getAvailableMergeFields();
    const allAvailableFields = Object.values(availableFields).flat();

    const foundFields: string[] = [];
    const invalidFields: string[] = [];
    let match;

    while ((match = mergeFieldRegex.exec(content)) !== null) {
      const field = match[1];
      foundFields.push(field);

      if (!allAvailableFields.includes(field)) {
        invalidFields.push(field);
      }
    }

    return {
      valid: invalidFields.length === 0,
      invalidFields,
    };
  }
}
