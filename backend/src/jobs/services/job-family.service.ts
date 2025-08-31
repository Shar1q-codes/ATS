import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobFamily } from '../../entities/job-family.entity';
import { CreateJobFamilyDto } from '../dto/create-job-family.dto';
import { UpdateJobFamilyDto } from '../dto/update-job-family.dto';
import { JobFamilyResponseDto } from '../dto/job-family-response.dto';
import { TenantAwareService } from '../../common/base/tenant-aware.service';
import { TenantAwareRepository } from '../../common/base/tenant-aware.repository';

@Injectable()
export class JobFamilyService extends TenantAwareService<JobFamily> {
  constructor(
    @InjectRepository(JobFamily)
    private readonly jobFamilyRepository: TenantAwareRepository<JobFamily>,
  ) {
    super(jobFamilyRepository);
  }

  async createJobFamily(
    tenantId: string,
    createJobFamilyDto: CreateJobFamilyDto,
  ): Promise<JobFamilyResponseDto> {
    const savedJobFamily = await this.create(tenantId, createJobFamilyDto);
    return this.toResponseDto(savedJobFamily);
  }

  async findAllJobFamilies(tenantId: string): Promise<JobFamilyResponseDto[]> {
    const jobFamilies = await this.findAll(tenantId, {
      relations: ['baseRequirements'],
      order: { createdAt: 'DESC' },
    });
    return jobFamilies.map((jobFamily) => this.toResponseDto(jobFamily));
  }

  async findOneJobFamily(
    tenantId: string,
    id: string,
  ): Promise<JobFamilyResponseDto> {
    const jobFamily = await this.jobFamilyRepository.findOneByTenant(tenantId, {
      where: { id },
      relations: ['baseRequirements', 'jobTemplates'],
    });

    if (!jobFamily) {
      throw new NotFoundException(`JobFamily with ID ${id} not found`);
    }

    return this.toResponseDto(jobFamily);
  }

  async updateJobFamily(
    tenantId: string,
    id: string,
    updateJobFamilyDto: UpdateJobFamilyDto,
  ): Promise<JobFamilyResponseDto> {
    const updatedJobFamily = await this.update(
      tenantId,
      id,
      updateJobFamilyDto,
    );
    return this.toResponseDto(updatedJobFamily);
  }

  async removeJobFamily(tenantId: string, id: string): Promise<void> {
    await this.remove(tenantId, id);
  }

  private toResponseDto(jobFamily: JobFamily): JobFamilyResponseDto {
    return {
      id: jobFamily.id,
      name: jobFamily.name,
      description: jobFamily.description,
      skillCategories: jobFamily.skillCategories,
      createdAt: jobFamily.createdAt,
      updatedAt: jobFamily.updatedAt,
      baseRequirements: jobFamily.baseRequirements,
    };
  }
}
