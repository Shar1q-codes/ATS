import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyJobVariant } from '../../entities/company-job-variant.entity';
import { RequirementItem } from '../../entities/requirement-item.entity';
import { JobTemplate } from '../../entities/job-template.entity';
import { CompanyProfile } from '../../entities/company-profile.entity';
import { CreateCompanyJobVariantDto } from '../dto/create-company-job-variant.dto';
import { UpdateCompanyJobVariantDto } from '../dto/update-company-job-variant.dto';
import { CompanyJobVariantResponseDto } from '../dto/company-job-variant-response.dto';
import { ResolvedJobSpecDto } from '../dto/resolved-job-spec.dto';

@Injectable()
export class CompanyJobVariantService {
  constructor(
    @InjectRepository(CompanyJobVariant)
    private readonly companyJobVariantRepository: Repository<CompanyJobVariant>,
    @InjectRepository(RequirementItem)
    private readonly requirementItemRepository: Repository<RequirementItem>,
    @InjectRepository(JobTemplate)
    private readonly jobTemplateRepository: Repository<JobTemplate>,
    @InjectRepository(CompanyProfile)
    private readonly companyProfileRepository: Repository<CompanyProfile>,
  ) {}

  async create(
    createCompanyJobVariantDto: CreateCompanyJobVariantDto,
  ): Promise<CompanyJobVariantResponseDto> {
    // Validate job template exists
    const jobTemplate = await this.jobTemplateRepository.findOne({
      where: { id: createCompanyJobVariantDto.jobTemplateId },
    });

    if (!jobTemplate) {
      throw new NotFoundException(
        `JobTemplate with ID ${createCompanyJobVariantDto.jobTemplateId} not found`,
      );
    }

    // Validate company profile exists
    const companyProfile = await this.companyProfileRepository.findOne({
      where: { id: createCompanyJobVariantDto.companyProfileId },
    });

    if (!companyProfile) {
      throw new NotFoundException(
        `CompanyProfile with ID ${createCompanyJobVariantDto.companyProfileId} not found`,
      );
    }

    const { additionalRequirements, modifiedRequirements, ...variantData } =
      createCompanyJobVariantDto;

    // Create company job variant
    const companyJobVariant = this.companyJobVariantRepository.create({
      ...variantData,
      isActive: variantData.isActive ?? true,
    });
    const savedVariant =
      await this.companyJobVariantRepository.save(companyJobVariant);

    // Create additional requirements if provided
    if (additionalRequirements && additionalRequirements.length > 0) {
      const additionalRequirementEntities = additionalRequirements.map((req) =>
        this.requirementItemRepository.create({
          ...req,
          companyJobVariantId: savedVariant.id,
          weight: req.weight || 5,
        }),
      );
      await this.requirementItemRepository.save(additionalRequirementEntities);
    }

    // Create modified requirements if provided
    if (modifiedRequirements && modifiedRequirements.length > 0) {
      const modifiedRequirementEntities = modifiedRequirements.map((req) =>
        this.requirementItemRepository.create({
          ...req,
          companyJobVariantId: savedVariant.id,
          weight: req.weight || 5,
        }),
      );
      await this.requirementItemRepository.save(modifiedRequirementEntities);
    }

    return this.findOne(savedVariant.id);
  }

  async findAll(): Promise<CompanyJobVariantResponseDto[]> {
    const variants = await this.companyJobVariantRepository.find({
      relations: ['jobTemplate', 'companyProfile', 'requirements'],
      order: { createdAt: 'DESC' },
    });
    return variants.map((variant) => this.toResponseDto(variant));
  }

  async findOne(id: string): Promise<CompanyJobVariantResponseDto> {
    const variant = await this.companyJobVariantRepository.findOne({
      where: { id },
      relations: [
        'jobTemplate',
        'companyProfile',
        'requirements',
        'jobTemplate.jobFamily',
      ],
    });

    if (!variant) {
      throw new NotFoundException(`CompanyJobVariant with ID ${id} not found`);
    }

    return this.toResponseDto(variant);
  }

  async findByCompany(
    companyProfileId: string,
  ): Promise<CompanyJobVariantResponseDto[]> {
    const variants = await this.companyJobVariantRepository.find({
      where: { companyProfileId },
      relations: ['jobTemplate', 'companyProfile', 'requirements'],
      order: { createdAt: 'DESC' },
    });
    return variants.map((variant) => this.toResponseDto(variant));
  }

  async findByJobTemplate(
    jobTemplateId: string,
  ): Promise<CompanyJobVariantResponseDto[]> {
    const variants = await this.companyJobVariantRepository.find({
      where: { jobTemplateId },
      relations: ['jobTemplate', 'companyProfile', 'requirements'],
      order: { createdAt: 'DESC' },
    });
    return variants.map((variant) => this.toResponseDto(variant));
  }

  async update(
    id: string,
    updateCompanyJobVariantDto: UpdateCompanyJobVariantDto,
  ): Promise<CompanyJobVariantResponseDto> {
    const variant = await this.companyJobVariantRepository.findOne({
      where: { id },
      relations: ['requirements'],
    });

    if (!variant) {
      throw new NotFoundException(`CompanyJobVariant with ID ${id} not found`);
    }

    // Validate job template if being updated
    if (updateCompanyJobVariantDto.jobTemplateId) {
      const jobTemplate = await this.jobTemplateRepository.findOne({
        where: { id: updateCompanyJobVariantDto.jobTemplateId },
      });

      if (!jobTemplate) {
        throw new NotFoundException(
          `JobTemplate with ID ${updateCompanyJobVariantDto.jobTemplateId} not found`,
        );
      }
    }

    // Validate company profile if being updated
    if (updateCompanyJobVariantDto.companyProfileId) {
      const companyProfile = await this.companyProfileRepository.findOne({
        where: { id: updateCompanyJobVariantDto.companyProfileId },
      });

      if (!companyProfile) {
        throw new NotFoundException(
          `CompanyProfile with ID ${updateCompanyJobVariantDto.companyProfileId} not found`,
        );
      }
    }

    const { additionalRequirements, modifiedRequirements, ...variantData } =
      updateCompanyJobVariantDto;

    // Update variant
    Object.assign(variant, variantData);
    await this.companyJobVariantRepository.save(variant);

    // Update requirements if provided
    if (
      additionalRequirements !== undefined ||
      modifiedRequirements !== undefined
    ) {
      // Remove existing requirements for this variant
      await this.requirementItemRepository.delete({ companyJobVariantId: id });

      // Add new additional requirements
      if (additionalRequirements && additionalRequirements.length > 0) {
        const additionalRequirementEntities = additionalRequirements.map(
          (req) =>
            this.requirementItemRepository.create({
              ...req,
              companyJobVariantId: id,
              weight: req.weight || 5,
            }),
        );
        await this.requirementItemRepository.save(
          additionalRequirementEntities,
        );
      }

      // Add new modified requirements
      if (modifiedRequirements && modifiedRequirements.length > 0) {
        const modifiedRequirementEntities = modifiedRequirements.map((req) =>
          this.requirementItemRepository.create({
            ...req,
            companyJobVariantId: id,
            weight: req.weight || 5,
          }),
        );
        await this.requirementItemRepository.save(modifiedRequirementEntities);
      }
    }

    return this.findOne(id);
  }

  async publish(id: string): Promise<CompanyJobVariantResponseDto> {
    const variant = await this.companyJobVariantRepository.findOne({
      where: { id },
    });

    if (!variant) {
      throw new NotFoundException(`CompanyJobVariant with ID ${id} not found`);
    }

    variant.isActive = true;
    variant.publishedAt = new Date();
    await this.companyJobVariantRepository.save(variant);

    return this.findOne(id);
  }

  async unpublish(id: string): Promise<CompanyJobVariantResponseDto> {
    const variant = await this.companyJobVariantRepository.findOne({
      where: { id },
    });

    if (!variant) {
      throw new NotFoundException(`CompanyJobVariant with ID ${id} not found`);
    }

    variant.isActive = false;
    await this.companyJobVariantRepository.save(variant);

    return this.findOne(id);
  }

  async resolveJobSpec(id: string): Promise<ResolvedJobSpecDto> {
    const variant = await this.companyJobVariantRepository.findOne({
      where: { id },
      relations: [
        'jobTemplate',
        'jobTemplate.jobFamily',
        'jobTemplate.requirements',
        'companyProfile',
        'requirements',
      ],
    });

    if (!variant) {
      throw new NotFoundException(`CompanyJobVariant with ID ${id} not found`);
    }

    // Combine requirements from job family, job template, and variant
    const allRequirements: RequirementItem[] = [
      ...(variant.jobTemplate.jobFamily?.baseRequirements || []),
      ...(variant.jobTemplate.requirements || []),
      ...(variant.requirements || []),
    ];

    // Remove duplicates based on description (simple deduplication)
    const uniqueRequirements = allRequirements.filter(
      (req, index, self) =>
        index === self.findIndex((r) => r.description === req.description),
    );

    // Determine title
    const title = variant.customTitle || variant.jobTemplate.name;

    // Determine description
    const description =
      variant.customDescription ||
      `${title} position at ${variant.companyProfile.name}`;

    // Build salary range
    const salaryRange =
      variant.jobTemplate.salaryRangeMin && variant.jobTemplate.salaryRangeMax
        ? {
            min: variant.jobTemplate.salaryRangeMin,
            max: variant.jobTemplate.salaryRangeMax,
            currency: variant.jobTemplate.salaryCurrency,
          }
        : undefined;

    return {
      title,
      description,
      requirements: uniqueRequirements,
      company: variant.companyProfile,
      salaryRange,
      benefits: variant.companyProfile.benefits || [],
      workArrangement:
        variant.companyProfile.workArrangement || 'Not specified',
      location: variant.companyProfile.location || 'Not specified',
    };
  }

  async remove(id: string): Promise<void> {
    const result = await this.companyJobVariantRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`CompanyJobVariant with ID ${id} not found`);
    }
  }

  private toResponseDto(
    variant: CompanyJobVariant,
  ): CompanyJobVariantResponseDto {
    return {
      id: variant.id,
      jobTemplateId: variant.jobTemplateId,
      companyProfileId: variant.companyProfileId,
      customTitle: variant.customTitle,
      customDescription: variant.customDescription,
      isActive: variant.isActive,
      publishedAt: variant.publishedAt,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
      jobTemplate: variant.jobTemplate,
      companyProfile: variant.companyProfile,
      requirements: variant.requirements,
    };
  }
}
