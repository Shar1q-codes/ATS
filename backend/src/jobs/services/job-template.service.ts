import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobTemplate } from '../../entities/job-template.entity';
import { RequirementItem } from '../../entities/requirement-item.entity';
import { JobFamily } from '../../entities/job-family.entity';
import { CreateJobTemplateDto } from '../dto/create-job-template.dto';
import { UpdateJobTemplateDto } from '../dto/update-job-template.dto';
import { JobTemplateResponseDto } from '../dto/job-template-response.dto';

@Injectable()
export class JobTemplateService {
  constructor(
    @InjectRepository(JobTemplate)
    private readonly jobTemplateRepository: Repository<JobTemplate>,
    @InjectRepository(RequirementItem)
    private readonly requirementItemRepository: Repository<RequirementItem>,
    @InjectRepository(JobFamily)
    private readonly jobFamilyRepository: Repository<JobFamily>,
  ) {}

  async create(
    createJobTemplateDto: CreateJobTemplateDto,
  ): Promise<JobTemplateResponseDto> {
    // Validate job family exists
    const jobFamily = await this.jobFamilyRepository.findOne({
      where: { id: createJobTemplateDto.jobFamilyId },
    });

    if (!jobFamily) {
      throw new NotFoundException(
        `JobFamily with ID ${createJobTemplateDto.jobFamilyId} not found`,
      );
    }

    // Validate experience range
    if (
      createJobTemplateDto.experienceRangeMin !== undefined &&
      createJobTemplateDto.experienceRangeMax !== undefined &&
      createJobTemplateDto.experienceRangeMin >
        createJobTemplateDto.experienceRangeMax
    ) {
      throw new BadRequestException(
        'Experience range minimum cannot be greater than maximum',
      );
    }

    // Validate salary range
    if (
      createJobTemplateDto.salaryRangeMin !== undefined &&
      createJobTemplateDto.salaryRangeMax !== undefined &&
      createJobTemplateDto.salaryRangeMin > createJobTemplateDto.salaryRangeMax
    ) {
      throw new BadRequestException(
        'Salary range minimum cannot be greater than maximum',
      );
    }

    const { requirements, ...jobTemplateData } = createJobTemplateDto;

    // Create job template
    const jobTemplate = this.jobTemplateRepository.create(jobTemplateData);
    const savedJobTemplate = await this.jobTemplateRepository.save(jobTemplate);

    // Create requirements if provided
    if (requirements && requirements.length > 0) {
      const requirementEntities = requirements.map((req) =>
        this.requirementItemRepository.create({
          ...req,
          jobTemplateId: savedJobTemplate.id,
          weight: req.weight || 5, // Default weight
        }),
      );
      await this.requirementItemRepository.save(requirementEntities);
    }

    return this.findOne(savedJobTemplate.id);
  }

  async findAll(): Promise<JobTemplateResponseDto[]> {
    const jobTemplates = await this.jobTemplateRepository.find({
      relations: ['jobFamily', 'requirements'],
      order: { createdAt: 'DESC' },
    });
    return jobTemplates.map((template) => this.toResponseDto(template));
  }

  async findOne(id: string): Promise<JobTemplateResponseDto> {
    const jobTemplate = await this.jobTemplateRepository.findOne({
      where: { id },
      relations: ['jobFamily', 'requirements'],
    });

    if (!jobTemplate) {
      throw new NotFoundException(`JobTemplate with ID ${id} not found`);
    }

    return this.toResponseDto(jobTemplate);
  }

  async findByJobFamily(
    jobFamilyId: string,
  ): Promise<JobTemplateResponseDto[]> {
    const jobTemplates = await this.jobTemplateRepository.find({
      where: { jobFamilyId },
      relations: ['jobFamily', 'requirements'],
      order: { createdAt: 'DESC' },
    });
    return jobTemplates.map((template) => this.toResponseDto(template));
  }

  async update(
    id: string,
    updateJobTemplateDto: UpdateJobTemplateDto,
  ): Promise<JobTemplateResponseDto> {
    const jobTemplate = await this.jobTemplateRepository.findOne({
      where: { id },
      relations: ['requirements'],
    });

    if (!jobTemplate) {
      throw new NotFoundException(`JobTemplate with ID ${id} not found`);
    }

    // Validate job family if being updated
    if (updateJobTemplateDto.jobFamilyId) {
      const jobFamily = await this.jobFamilyRepository.findOne({
        where: { id: updateJobTemplateDto.jobFamilyId },
      });

      if (!jobFamily) {
        throw new NotFoundException(
          `JobFamily with ID ${updateJobTemplateDto.jobFamilyId} not found`,
        );
      }
    }

    // Validate experience range
    const newMinExp =
      updateJobTemplateDto.experienceRangeMin ?? jobTemplate.experienceRangeMin;
    const newMaxExp =
      updateJobTemplateDto.experienceRangeMax ?? jobTemplate.experienceRangeMax;

    if (
      newMinExp !== undefined &&
      newMaxExp !== undefined &&
      newMinExp > newMaxExp
    ) {
      throw new BadRequestException(
        'Experience range minimum cannot be greater than maximum',
      );
    }

    // Validate salary range
    const newMinSalary =
      updateJobTemplateDto.salaryRangeMin ?? jobTemplate.salaryRangeMin;
    const newMaxSalary =
      updateJobTemplateDto.salaryRangeMax ?? jobTemplate.salaryRangeMax;

    if (
      newMinSalary !== undefined &&
      newMaxSalary !== undefined &&
      newMinSalary > newMaxSalary
    ) {
      throw new BadRequestException(
        'Salary range minimum cannot be greater than maximum',
      );
    }

    const { requirements, ...jobTemplateData } = updateJobTemplateDto;

    // Update job template
    Object.assign(jobTemplate, jobTemplateData);
    await this.jobTemplateRepository.save(jobTemplate);

    // Update requirements if provided
    if (requirements !== undefined) {
      // Remove existing requirements
      await this.requirementItemRepository.delete({ jobTemplateId: id });

      // Add new requirements
      if (requirements.length > 0) {
        const requirementEntities = requirements.map((req) =>
          this.requirementItemRepository.create({
            ...req,
            jobTemplateId: id,
            weight: req.weight || 5,
          }),
        );
        await this.requirementItemRepository.save(requirementEntities);
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.jobTemplateRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`JobTemplate with ID ${id} not found`);
    }
  }

  private toResponseDto(jobTemplate: JobTemplate): JobTemplateResponseDto {
    return {
      id: jobTemplate.id,
      jobFamilyId: jobTemplate.jobFamilyId,
      name: jobTemplate.name,
      level: jobTemplate.level,
      experienceRangeMin: jobTemplate.experienceRangeMin,
      experienceRangeMax: jobTemplate.experienceRangeMax,
      salaryRangeMin: jobTemplate.salaryRangeMin,
      salaryRangeMax: jobTemplate.salaryRangeMax,
      salaryCurrency: jobTemplate.salaryCurrency,
      createdAt: jobTemplate.createdAt,
      updatedAt: jobTemplate.updatedAt,
      jobFamily: jobTemplate.jobFamily,
      requirements: jobTemplate.requirements,
    };
  }
}
