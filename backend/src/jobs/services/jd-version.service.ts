import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JdVersion, ResolvedJobSpec } from '../../entities/jd-version.entity';
import { CompanyJobVariant } from '../../entities/company-job-variant.entity';
import { User } from '../../entities/user.entity';
import { CreateJdVersionDto } from '../dto/create-jd-version.dto';
import { UpdateJdVersionDto } from '../dto/update-jd-version.dto';
import { JdVersionResponseDto } from '../dto/jd-version-response.dto';
import { CompanyJobVariantService } from './company-job-variant.service';

@Injectable()
export class JdVersionService {
  constructor(
    @InjectRepository(JdVersion)
    private readonly jdVersionRepository: Repository<JdVersion>,
    @InjectRepository(CompanyJobVariant)
    private readonly companyJobVariantRepository: Repository<CompanyJobVariant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly companyJobVariantService: CompanyJobVariantService,
  ) {}

  async create(
    createJdVersionDto: CreateJdVersionDto,
    createdById: string,
  ): Promise<JdVersionResponseDto> {
    // Validate company job variant exists
    const variant = await this.companyJobVariantRepository.findOne({
      where: { id: createJdVersionDto.companyJobVariantId },
    });

    if (!variant) {
      throw new NotFoundException(
        `CompanyJobVariant with ID ${createJdVersionDto.companyJobVariantId} not found`,
      );
    }

    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: createdById },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${createdById} not found`);
    }

    // Get the next version number
    const latestVersion = await this.jdVersionRepository.findOne({
      where: { companyJobVariantId: createJdVersionDto.companyJobVariantId },
      order: { version: 'DESC' },
    });

    const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

    // Generate resolved job spec
    const resolvedSpec = await this.generateResolvedJobSpec(
      createJdVersionDto.companyJobVariantId,
      createJdVersionDto.customTitle,
      createJdVersionDto.customDescription,
    );

    // Generate published content (job description)
    const publishedContent = await this.generateJobDescription(resolvedSpec);

    // Create JD version
    const jdVersion = this.jdVersionRepository.create({
      companyJobVariantId: createJdVersionDto.companyJobVariantId,
      version: nextVersion,
      resolvedSpec,
      publishedContent,
      createdById,
    });

    const savedJdVersion = await this.jdVersionRepository.save(jdVersion);
    return this.findOne(savedJdVersion.id);
  }

  async findAll(): Promise<JdVersionResponseDto[]> {
    const jdVersions = await this.jdVersionRepository.find({
      relations: ['companyJobVariant', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
    return jdVersions.map((version) => this.toResponseDto(version));
  }

  async findOne(id: string): Promise<JdVersionResponseDto> {
    const jdVersion = await this.jdVersionRepository.findOne({
      where: { id },
      relations: ['companyJobVariant', 'createdBy'],
    });

    if (!jdVersion) {
      throw new NotFoundException(`JdVersion with ID ${id} not found`);
    }

    return this.toResponseDto(jdVersion);
  }

  async findByCompanyJobVariant(
    companyJobVariantId: string,
  ): Promise<JdVersionResponseDto[]> {
    const jdVersions = await this.jdVersionRepository.find({
      where: { companyJobVariantId },
      relations: ['companyJobVariant', 'createdBy'],
      order: { version: 'DESC' },
    });
    return jdVersions.map((version) => this.toResponseDto(version));
  }

  async findLatestByCompanyJobVariant(
    companyJobVariantId: string,
  ): Promise<JdVersionResponseDto> {
    const jdVersion = await this.jdVersionRepository.findOne({
      where: { companyJobVariantId },
      relations: ['companyJobVariant', 'createdBy'],
      order: { version: 'DESC' },
    });

    if (!jdVersion) {
      throw new NotFoundException(
        `No JdVersion found for CompanyJobVariant with ID ${companyJobVariantId}`,
      );
    }

    return this.toResponseDto(jdVersion);
  }

  async update(
    id: string,
    updateJdVersionDto: UpdateJdVersionDto,
  ): Promise<JdVersionResponseDto> {
    const jdVersion = await this.jdVersionRepository.findOne({ where: { id } });

    if (!jdVersion) {
      throw new NotFoundException(`JdVersion with ID ${id} not found`);
    }

    // If updating the variant or custom fields, regenerate the resolved spec
    if (
      updateJdVersionDto.companyJobVariantId ||
      updateJdVersionDto.customTitle !== undefined ||
      updateJdVersionDto.customDescription !== undefined
    ) {
      const variantId =
        updateJdVersionDto.companyJobVariantId || jdVersion.companyJobVariantId;

      // Validate new variant if changed
      if (
        updateJdVersionDto.companyJobVariantId &&
        updateJdVersionDto.companyJobVariantId !== jdVersion.companyJobVariantId
      ) {
        const variant = await this.companyJobVariantRepository.findOne({
          where: { id: updateJdVersionDto.companyJobVariantId },
        });

        if (!variant) {
          throw new NotFoundException(
            `CompanyJobVariant with ID ${updateJdVersionDto.companyJobVariantId} not found`,
          );
        }
      }

      // Regenerate resolved spec
      const resolvedSpec = await this.generateResolvedJobSpec(
        variantId,
        updateJdVersionDto.customTitle,
        updateJdVersionDto.customDescription,
      );

      // Regenerate published content
      const publishedContent = await this.generateJobDescription(resolvedSpec);

      Object.assign(jdVersion, {
        ...updateJdVersionDto,
        resolvedSpec,
        publishedContent,
      });
    } else {
      Object.assign(jdVersion, updateJdVersionDto);
    }

    const updatedJdVersion = await this.jdVersionRepository.save(jdVersion);
    return this.findOne(updatedJdVersion.id);
  }

  async regenerateJobDescription(id: string): Promise<JdVersionResponseDto> {
    const jdVersion = await this.jdVersionRepository.findOne({ where: { id } });

    if (!jdVersion) {
      throw new NotFoundException(`JdVersion with ID ${id} not found`);
    }

    // Regenerate published content from resolved spec
    const publishedContent = await this.generateJobDescription(
      jdVersion.resolvedSpec,
    );

    jdVersion.publishedContent = publishedContent;
    const updatedJdVersion = await this.jdVersionRepository.save(jdVersion);

    return this.toResponseDto(updatedJdVersion);
  }

  async remove(id: string): Promise<void> {
    const result = await this.jdVersionRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`JdVersion with ID ${id} not found`);
    }
  }

  private async generateResolvedJobSpec(
    companyJobVariantId: string,
    customTitle?: string,
    customDescription?: string,
  ): Promise<ResolvedJobSpec> {
    // Use the existing resolveJobSpec method from CompanyJobVariantService
    const resolvedSpec =
      await this.companyJobVariantService.resolveJobSpec(companyJobVariantId);

    // Apply custom overrides if provided
    if (customTitle) {
      resolvedSpec.title = customTitle;
    }

    if (customDescription) {
      resolvedSpec.description = customDescription;
    }

    return resolvedSpec;
  }

  private async generateJobDescription(
    resolvedSpec: ResolvedJobSpec,
  ): Promise<string> {
    // Generate a formatted job description for external posting
    const sections: string[] = [];

    // Title and Company
    sections.push(`# ${resolvedSpec.title}`);
    sections.push(`**Company:** ${resolvedSpec.company.name}`);

    if (resolvedSpec.company.industry) {
      sections.push(`**Industry:** ${resolvedSpec.company.industry}`);
    }

    if (resolvedSpec.location) {
      sections.push(`**Location:** ${resolvedSpec.location}`);
    }

    if (resolvedSpec.workArrangement) {
      sections.push(`**Work Arrangement:** ${resolvedSpec.workArrangement}`);
    }

    // Description
    sections.push('');
    sections.push('## Job Description');
    sections.push(resolvedSpec.description);

    // Requirements
    if (resolvedSpec.requirements && resolvedSpec.requirements.length > 0) {
      const categorizedReqs = {
        must: resolvedSpec.requirements.filter(
          (req) => req.category === 'must',
        ),
        should: resolvedSpec.requirements.filter(
          (req) => req.category === 'should',
        ),
        nice: resolvedSpec.requirements.filter(
          (req) => req.category === 'nice',
        ),
      };

      sections.push('');
      sections.push('## Requirements');

      if (categorizedReqs.must.length > 0) {
        sections.push('');
        sections.push('### Required Qualifications');
        categorizedReqs.must.forEach((req) => {
          sections.push(`- ${req.description}`);
        });
      }

      if (categorizedReqs.should.length > 0) {
        sections.push('');
        sections.push('### Preferred Qualifications');
        categorizedReqs.should.forEach((req) => {
          sections.push(`- ${req.description}`);
        });
      }

      if (categorizedReqs.nice.length > 0) {
        sections.push('');
        sections.push('### Nice to Have');
        categorizedReqs.nice.forEach((req) => {
          sections.push(`- ${req.description}`);
        });
      }
    }

    // Salary Range
    if (resolvedSpec.salaryRange) {
      sections.push('');
      sections.push('## Compensation');
      sections.push(
        `**Salary Range:** ${resolvedSpec.salaryRange.min.toLocaleString()} - ${resolvedSpec.salaryRange.max.toLocaleString()} ${resolvedSpec.salaryRange.currency}`,
      );
    }

    // Benefits
    if (resolvedSpec.benefits && resolvedSpec.benefits.length > 0) {
      sections.push('');
      sections.push('## Benefits');
      resolvedSpec.benefits.forEach((benefit) => {
        sections.push(`- ${benefit}`);
      });
    }

    // Company Culture
    if (
      resolvedSpec.company.culture &&
      resolvedSpec.company.culture.length > 0
    ) {
      sections.push('');
      sections.push('## Company Culture');
      resolvedSpec.company.culture.forEach((culture) => {
        sections.push(`- ${culture}`);
      });
    }

    return sections.join('\n');
  }

  private toResponseDto(jdVersion: JdVersion): JdVersionResponseDto {
    return {
      id: jdVersion.id,
      companyJobVariantId: jdVersion.companyJobVariantId,
      version: jdVersion.version,
      resolvedSpec: jdVersion.resolvedSpec,
      publishedContent: jdVersion.publishedContent,
      createdById: jdVersion.createdById,
      createdAt: jdVersion.createdAt,
      companyJobVariant: jdVersion.companyJobVariant,
      createdBy: jdVersion.createdBy,
    };
  }
}
