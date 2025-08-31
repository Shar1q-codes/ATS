import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FieldMapping } from '../../entities/field-mapping.entity';
import { ImportType } from '../../entities/import-job.entity';

@Injectable()
export class MappingService {
  constructor(
    @InjectRepository(FieldMapping)
    private fieldMappingRepository: Repository<FieldMapping>,
  ) {}

  async createFieldMapping(
    name: string,
    type: ImportType,
    mapping: Record<string, string>,
    transformations: Record<string, any> | undefined,
    organizationId: string,
    createdBy: string,
    isDefault = false,
  ): Promise<FieldMapping> {
    const fieldMapping = this.fieldMappingRepository.create({
      name,
      type,
      mapping,
      transformations,
      organizationId,
      createdBy,
      isDefault,
    });

    return this.fieldMappingRepository.save(fieldMapping);
  }

  async getFieldMappings(
    organizationId: string,
    type?: ImportType,
  ): Promise<FieldMapping[]> {
    const query = this.fieldMappingRepository
      .createQueryBuilder('mapping')
      .where('mapping.organizationId = :organizationId', { organizationId });

    if (type) {
      query.andWhere('mapping.type = :type', { type });
    }

    return query
      .orderBy('mapping.isDefault', 'DESC')
      .addOrderBy('mapping.createdAt', 'DESC')
      .getMany();
  }

  async getDefaultFieldMapping(
    organizationId: string,
    type: ImportType,
  ): Promise<FieldMapping | null> {
    return this.fieldMappingRepository.findOne({
      where: {
        organizationId,
        type,
        isDefault: true,
      },
    });
  }

  async updateFieldMapping(
    id: string,
    organizationId: string,
    updates: Partial<FieldMapping>,
  ): Promise<FieldMapping> {
    await this.fieldMappingRepository.update({ id, organizationId }, updates);

    const updated = await this.fieldMappingRepository.findOne({
      where: { id, organizationId },
    });

    if (!updated) {
      throw new Error('Field mapping not found');
    }

    return updated;
  }

  async deleteFieldMapping(id: string, organizationId: string): Promise<void> {
    await this.fieldMappingRepository.delete({ id, organizationId });
  }

  transformRecord(
    record: any,
    mapping: Record<string, string>,
    transformations?: Record<string, any>,
  ): any {
    const transformed: any = {};

    // Apply field mapping
    for (const [sourceField, targetField] of Object.entries(mapping)) {
      if (record[sourceField] !== undefined) {
        transformed[targetField] = record[sourceField];
      }
    }

    // Apply transformations
    if (transformations) {
      for (const [field, transformation] of Object.entries(transformations)) {
        if (transformed[field] !== undefined) {
          transformed[field] = this.applyTransformation(
            transformed[field],
            transformation,
          );
        } else if (transformation.defaultValue !== undefined) {
          transformed[field] = transformation.defaultValue;
        }
      }
    }

    return transformed;
  }

  private applyTransformation(value: any, transformation: any): any {
    if (value === null || value === undefined || value === '') {
      return transformation.defaultValue;
    }

    switch (transformation.type) {
      case 'date':
        if (transformation.format) {
          // Handle different date formats
          return this.parseDate(value, transformation.format);
        }
        return new Date(value);

      case 'number':
        const num = Number(value);
        return isNaN(num) ? transformation.defaultValue : num;

      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          return lower === 'true' || lower === 'yes' || lower === '1';
        }
        return Boolean(value);

      case 'string':
        return String(value).trim();

      case 'array':
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          // Split by comma, semicolon, or pipe
          return value
            .split(/[,;|]/)
            .map((item) => item.trim())
            .filter(Boolean);
        }
        return [value];

      default:
        return value;
    }
  }

  private parseDate(value: any, format: string): Date {
    // Simple date parsing - in production, you might want to use a library like moment.js
    if (format === 'MM/DD/YYYY') {
      const [month, day, year] = value.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (format === 'DD/MM/YYYY') {
      const [day, month, year] = value.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (format === 'YYYY-MM-DD') {
      return new Date(value);
    }

    // Fallback to default parsing
    return new Date(value);
  }

  getDefaultCandidateMapping(): Record<string, string> {
    return {
      Email: 'email',
      'First Name': 'firstName',
      'Last Name': 'lastName',
      Phone: 'phone',
      Location: 'location',
      'LinkedIn URL': 'linkedinUrl',
      'Portfolio URL': 'portfolioUrl',
      Source: 'source',
      'Experience (Years)': 'totalExperience',
      Skills: 'skills',
      Gender: 'gender',
      Ethnicity: 'ethnicity',
      Age: 'age',
      Education: 'education',
    };
  }

  getDefaultJobMapping(): Record<string, string> {
    return {
      'Job Title': 'name',
      'Job Family ID': 'jobFamilyId',
      Level: 'level',
      Description: 'description',
      'Min Salary': 'minSalary',
      'Max Salary': 'maxSalary',
      Currency: 'currency',
      'Min Experience': 'minExperience',
      'Max Experience': 'maxExperience',
      Location: 'location',
      Remote: 'isRemote',
    };
  }

  getDefaultApplicationMapping(): Record<string, string> {
    return {
      'Candidate ID': 'candidateId',
      'Job Variant ID': 'companyJobVariantId',
      Status: 'status',
      'Fit Score': 'fitScore',
      'Applied Date': 'appliedAt',
      Source: 'source',
      Notes: 'notes',
    };
  }

  getDefaultCompanyMapping(): Record<string, string> {
    return {
      'Company Name': 'name',
      Industry: 'industry',
      Size: 'size',
      Location: 'location',
      Website: 'website',
      Description: 'description',
      'Work Arrangement': 'workArrangement',
      Benefits: 'benefits',
      Culture: 'culture',
    };
  }

  detectFieldMapping(
    headers: string[],
    type: ImportType,
  ): Record<string, string> {
    let defaultMapping: Record<string, string>;

    switch (type) {
      case ImportType.CANDIDATES:
        defaultMapping = this.getDefaultCandidateMapping();
        break;
      case ImportType.JOBS:
        defaultMapping = this.getDefaultJobMapping();
        break;
      case ImportType.APPLICATIONS:
        defaultMapping = this.getDefaultApplicationMapping();
        break;
      case ImportType.COMPANIES:
        defaultMapping = this.getDefaultCompanyMapping();
        break;
      default:
        return {};
    }

    const detectedMapping: Record<string, string> = {};

    // Try to match headers with default mapping keys
    for (const header of headers) {
      const normalizedHeader = header.trim();

      // Exact match
      if (defaultMapping[normalizedHeader]) {
        detectedMapping[normalizedHeader] = defaultMapping[normalizedHeader];
        continue;
      }

      // Case-insensitive match
      const exactMatch = Object.keys(defaultMapping).find(
        (key) => key.toLowerCase() === normalizedHeader.toLowerCase(),
      );
      if (exactMatch) {
        detectedMapping[normalizedHeader] = defaultMapping[exactMatch];
        continue;
      }

      // Partial match
      const partialMatch = Object.keys(defaultMapping).find(
        (key) =>
          key.toLowerCase().includes(normalizedHeader.toLowerCase()) ||
          normalizedHeader.toLowerCase().includes(key.toLowerCase()),
      );
      if (partialMatch) {
        detectedMapping[normalizedHeader] = defaultMapping[partialMatch];
      }
    }

    return detectedMapping;
  }
}
