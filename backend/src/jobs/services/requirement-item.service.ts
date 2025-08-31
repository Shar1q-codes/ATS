import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RequirementItem,
  RequirementType,
  RequirementCategory,
} from '../../entities/requirement-item.entity';
import { JobFamily } from '../../entities/job-family.entity';
import { JobTemplate } from '../../entities/job-template.entity';
import { CompanyJobVariant } from '../../entities/company-job-variant.entity';
import { CreateRequirementItemDto } from '../dto/create-requirement-item.dto';
import { UpdateRequirementItemDto } from '../dto/update-requirement-item.dto';

export interface RequirementItemResponseDto {
  id: string;
  type?: RequirementType;
  category?: RequirementCategory;
  description: string;
  weight: number;
  alternatives?: string[];
  jobFamilyId?: string;
  jobTemplateId?: string;
  companyJobVariantId?: string;
  createdAt: Date;
}

@Injectable()
export class RequirementItemService {
  constructor(
    @InjectRepository(RequirementItem)
    private readonly requirementItemRepository: Repository<RequirementItem>,
    @InjectRepository(JobFamily)
    private readonly jobFamilyRepository: Repository<JobFamily>,
    @InjectRepository(JobTemplate)
    private readonly jobTemplateRepository: Repository<JobTemplate>,
    @InjectRepository(CompanyJobVariant)
    private readonly companyJobVariantRepository: Repository<CompanyJobVariant>,
  ) {}

  async create(
    createRequirementItemDto: CreateRequirementItemDto,
    parentId?: string,
    parentType?: 'job-family' | 'job-template' | 'company-job-variant',
  ): Promise<RequirementItemResponseDto> {
    // Validate parent entity if provided
    if (parentId && parentType) {
      await this.validateParentEntity(parentId, parentType);
    }

    // Validate category and weight
    this.validateRequirementData(createRequirementItemDto);

    const requirementData: Partial<RequirementItem> = {
      ...createRequirementItemDto,
      weight: createRequirementItemDto.weight || 5,
    };

    // Set parent relationship
    if (parentId && parentType) {
      switch (parentType) {
        case 'job-family':
          requirementData.jobFamilyId = parentId;
          break;
        case 'job-template':
          requirementData.jobTemplateId = parentId;
          break;
        case 'company-job-variant':
          requirementData.companyJobVariantId = parentId;
          break;
      }
    }

    const requirementItem =
      this.requirementItemRepository.create(requirementData);
    const savedRequirement =
      await this.requirementItemRepository.save(requirementItem);

    return this.toResponseDto(savedRequirement);
  }

  async findAll(): Promise<RequirementItemResponseDto[]> {
    const requirements = await this.requirementItemRepository.find({
      order: { createdAt: 'DESC' },
    });
    return requirements.map((req) => this.toResponseDto(req));
  }

  async findOne(id: string): Promise<RequirementItemResponseDto> {
    const requirement = await this.requirementItemRepository.findOne({
      where: { id },
    });

    if (!requirement) {
      throw new NotFoundException(`RequirementItem with ID ${id} not found`);
    }

    return this.toResponseDto(requirement);
  }

  async findByJobFamily(
    jobFamilyId: string,
  ): Promise<RequirementItemResponseDto[]> {
    const requirements = await this.requirementItemRepository.find({
      where: { jobFamilyId },
      order: { weight: 'DESC', createdAt: 'DESC' },
    });
    return requirements.map((req) => this.toResponseDto(req));
  }

  async findByJobTemplate(
    jobTemplateId: string,
  ): Promise<RequirementItemResponseDto[]> {
    const requirements = await this.requirementItemRepository.find({
      where: { jobTemplateId },
      order: { weight: 'DESC', createdAt: 'DESC' },
    });
    return requirements.map((req) => this.toResponseDto(req));
  }

  async findByCompanyJobVariant(
    companyJobVariantId: string,
  ): Promise<RequirementItemResponseDto[]> {
    const requirements = await this.requirementItemRepository.find({
      where: { companyJobVariantId },
      order: { weight: 'DESC', createdAt: 'DESC' },
    });
    return requirements.map((req) => this.toResponseDto(req));
  }

  async findByCategory(
    category: RequirementCategory,
  ): Promise<RequirementItemResponseDto[]> {
    const requirements = await this.requirementItemRepository.find({
      where: { category },
      order: { weight: 'DESC', createdAt: 'DESC' },
    });
    return requirements.map((req) => this.toResponseDto(req));
  }

  async findByType(
    type: RequirementType,
  ): Promise<RequirementItemResponseDto[]> {
    const requirements = await this.requirementItemRepository.find({
      where: { type },
      order: { weight: 'DESC', createdAt: 'DESC' },
    });
    return requirements.map((req) => this.toResponseDto(req));
  }

  async update(
    id: string,
    updateRequirementItemDto: UpdateRequirementItemDto,
  ): Promise<RequirementItemResponseDto> {
    const requirement = await this.requirementItemRepository.findOne({
      where: { id },
    });

    if (!requirement) {
      throw new NotFoundException(`RequirementItem with ID ${id} not found`);
    }

    // Validate updated data
    this.validateRequirementData(updateRequirementItemDto);

    Object.assign(requirement, updateRequirementItemDto);
    const updatedRequirement =
      await this.requirementItemRepository.save(requirement);

    return this.toResponseDto(updatedRequirement);
  }

  async categorizeRequirements(requirements: RequirementItem[]): Promise<{
    must: RequirementItem[];
    should: RequirementItem[];
    nice: RequirementItem[];
  }> {
    return {
      must: requirements.filter(
        (req) => req.category === RequirementCategory.MUST,
      ),
      should: requirements.filter(
        (req) => req.category === RequirementCategory.SHOULD,
      ),
      nice: requirements.filter(
        (req) => req.category === RequirementCategory.NICE,
      ),
    };
  }

  async validateRequirementLogic(requirements: RequirementItem[]): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate descriptions
    const descriptions = requirements.map((req) =>
      req.description.toLowerCase(),
    );
    const duplicates = descriptions.filter(
      (desc, index) => descriptions.indexOf(desc) !== index,
    );
    if (duplicates.length > 0) {
      warnings.push(
        `Duplicate requirement descriptions found: ${duplicates.join(', ')}`,
      );
    }

    // Check weight distribution
    const mustRequirements = requirements.filter(
      (req) => req.category === RequirementCategory.MUST,
    );
    const highWeightMustReqs = mustRequirements.filter(
      (req) => req.weight >= 8,
    );

    if (mustRequirements.length > 0 && highWeightMustReqs.length === 0) {
      warnings.push(
        'Consider having at least one high-weight (8+) MUST requirement',
      );
    }

    // Check for balanced categories
    const categorized = await this.categorizeRequirements(requirements);
    if (categorized.must.length === 0) {
      warnings.push(
        'No MUST requirements defined - consider adding critical requirements',
      );
    }

    if (categorized.must.length > 10) {
      warnings.push(
        'Too many MUST requirements (>10) - consider moving some to SHOULD category',
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async remove(id: string): Promise<void> {
    const result = await this.requirementItemRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`RequirementItem with ID ${id} not found`);
    }
  }

  private async validateParentEntity(
    parentId: string,
    parentType: string,
  ): Promise<void> {
    switch (parentType) {
      case 'job-family':
        const jobFamily = await this.jobFamilyRepository.findOne({
          where: { id: parentId },
        });
        if (!jobFamily) {
          throw new NotFoundException(
            `JobFamily with ID ${parentId} not found`,
          );
        }
        break;
      case 'job-template':
        const jobTemplate = await this.jobTemplateRepository.findOne({
          where: { id: parentId },
        });
        if (!jobTemplate) {
          throw new NotFoundException(
            `JobTemplate with ID ${parentId} not found`,
          );
        }
        break;
      case 'company-job-variant':
        const variant = await this.companyJobVariantRepository.findOne({
          where: { id: parentId },
        });
        if (!variant) {
          throw new NotFoundException(
            `CompanyJobVariant with ID ${parentId} not found`,
          );
        }
        break;
      default:
        throw new BadRequestException(`Invalid parent type: ${parentType}`);
    }
  }

  private validateRequirementData(
    data: CreateRequirementItemDto | UpdateRequirementItemDto,
  ): void {
    // Validate weight range
    if (data.weight !== undefined && (data.weight < 1 || data.weight > 10)) {
      throw new BadRequestException('Weight must be between 1 and 10');
    }

    // Validate description length
    if (data.description && data.description.trim().length < 3) {
      throw new BadRequestException(
        'Description must be at least 3 characters long',
      );
    }

    // Validate alternatives
    if (
      data.alternatives &&
      data.alternatives.some((alt) => alt.trim().length < 2)
    ) {
      throw new BadRequestException(
        'Alternative descriptions must be at least 2 characters long',
      );
    }
  }

  private toResponseDto(
    requirement: RequirementItem,
  ): RequirementItemResponseDto {
    return {
      id: requirement.id,
      type: requirement.type,
      category: requirement.category,
      description: requirement.description,
      weight: requirement.weight,
      alternatives: requirement.alternatives,
      jobFamilyId: requirement.jobFamilyId,
      jobTemplateId: requirement.jobTemplateId,
      companyJobVariantId: requirement.companyJobVariantId,
      createdAt: requirement.createdAt,
    };
  }
}
