import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EmailTemplate,
  EmailTemplateType,
  EmailTemplateStatus,
} from '../../entities';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto } from '../dto';
import { BaseService } from '../../common/base/base.service';

@Injectable()
export class EmailTemplateService extends BaseService<EmailTemplate> {
  constructor(
    @InjectRepository(EmailTemplate)
    private emailTemplateRepository: Repository<EmailTemplate>,
  ) {
    super(emailTemplateRepository);
  }

  async create(
    createDto: CreateEmailTemplateDto,
    userId: string,
  ): Promise<EmailTemplate> {
    // Check if template with same name and type exists for the company
    const existingTemplate = await this.emailTemplateRepository.findOne({
      where: {
        name: createDto.name,
        type: createDto.type,
        companyProfileId: createDto.companyProfileId || null,
      },
    });

    if (existingTemplate) {
      throw new ConflictException(
        `Email template with name "${createDto.name}" and type "${createDto.type}" already exists for this company`,
      );
    }

    const template = this.emailTemplateRepository.create({
      ...createDto,
      createdBy: userId,
      status: createDto.status || EmailTemplateStatus.DRAFT,
    });

    return await this.emailTemplateRepository.save(template);
  }

  async update(
    id: string,
    updateDto: UpdateEmailTemplateDto,
    userId: string,
  ): Promise<EmailTemplate> {
    const template = await this.emailTemplateRepository.findOneBy({ id });

    if (!template) {
      throw new NotFoundException(`Email template with ID ${id} not found`);
    }

    // Check for name/type conflicts if name or type is being updated
    if (updateDto.name || updateDto.type) {
      const existingTemplate = await this.emailTemplateRepository.findOne({
        where: {
          name: updateDto.name || template.name,
          type: updateDto.type || template.type,
          companyProfileId: template.companyProfileId,
          id: { $ne: id } as any, // Exclude current template
        },
      });

      if (existingTemplate) {
        throw new ConflictException(
          `Email template with name "${updateDto.name || template.name}" and type "${updateDto.type || template.type}" already exists for this company`,
        );
      }
    }

    Object.assign(template, updateDto, { updatedBy: userId });
    return await this.emailTemplateRepository.save(template);
  }

  async findByType(
    type: EmailTemplateType,
    companyProfileId?: string,
  ): Promise<EmailTemplate[]> {
    return await this.emailTemplateRepository.find({
      where: {
        type,
        companyProfileId: companyProfileId || null,
        status: EmailTemplateStatus.ACTIVE,
      },
      relations: ['companyProfile', 'creator'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCompany(companyProfileId: string): Promise<EmailTemplate[]> {
    return await this.emailTemplateRepository.find({
      where: { companyProfileId },
      relations: ['creator', 'updater'],
      order: { type: 'ASC', createdAt: 'DESC' },
    });
  }

  async findGlobalTemplates(): Promise<EmailTemplate[]> {
    return await this.emailTemplateRepository.find({
      where: { companyProfileId: null },
      relations: ['creator', 'updater'],
      order: { type: 'ASC', createdAt: 'DESC' },
    });
  }

  async activate(id: string, userId: string): Promise<EmailTemplate> {
    const template = await this.emailTemplateRepository.findOneBy({ id });

    if (!template) {
      throw new NotFoundException(`Email template with ID ${id} not found`);
    }

    template.status = EmailTemplateStatus.ACTIVE;
    template.updatedBy = userId;

    return await this.emailTemplateRepository.save(template);
  }

  async deactivate(id: string, userId: string): Promise<EmailTemplate> {
    const template = await this.emailTemplateRepository.findOneBy({ id });

    if (!template) {
      throw new NotFoundException(`Email template with ID ${id} not found`);
    }

    template.status = EmailTemplateStatus.INACTIVE;
    template.updatedBy = userId;

    return await this.emailTemplateRepository.save(template);
  }

  async duplicate(
    id: string,
    newName: string,
    userId: string,
  ): Promise<EmailTemplate> {
    const originalTemplate = await this.emailTemplateRepository.findOneBy({
      id,
    });

    if (!originalTemplate) {
      throw new NotFoundException(`Email template with ID ${id} not found`);
    }

    // Check if template with new name already exists
    const existingTemplate = await this.emailTemplateRepository.findOne({
      where: {
        name: newName,
        type: originalTemplate.type,
        companyProfileId: originalTemplate.companyProfileId,
      },
    });

    if (existingTemplate) {
      throw new ConflictException(
        `Email template with name "${newName}" and type "${originalTemplate.type}" already exists for this company`,
      );
    }

    const duplicatedTemplate = this.emailTemplateRepository.create({
      name: newName,
      type: originalTemplate.type,
      subject: originalTemplate.subject,
      htmlContent: originalTemplate.htmlContent,
      textContent: originalTemplate.textContent,
      status: EmailTemplateStatus.DRAFT,
      mergeFields: originalTemplate.mergeFields,
      description: `Copy of ${originalTemplate.name}`,
      companyProfileId: originalTemplate.companyProfileId,
      createdBy: userId,
    });

    return await this.emailTemplateRepository.save(duplicatedTemplate);
  }

  async getAvailableMergeFields(): Promise<string[]> {
    return [
      'candidate.firstName',
      'candidate.lastName',
      'candidate.email',
      'candidate.phone',
      'candidate.location',
      'job.title',
      'job.company',
      'job.location',
      'job.workArrangement',
      'company.name',
      'company.website',
      'application.appliedAt',
      'application.status',
      'recruiter.firstName',
      'recruiter.lastName',
      'recruiter.email',
      'currentDate',
      'currentTime',
    ];
  }
}
