import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import * as csv from 'csv-parser';
import { Readable } from 'stream';
import {
  ImportJob,
  ImportStatus,
  ImportType,
} from '../../entities/import-job.entity';
import { Candidate } from '../../entities/candidate.entity';
import { JobFamily } from '../../entities/job-family.entity';
import { Application } from '../../entities/application.entity';
import { CompanyProfile } from '../../entities/company-profile.entity';
import { ParsedResumeData } from '../../entities/parsed-resume-data.entity';
import { ValidationService, ValidationResult } from './validation.service';
import { MappingService } from './mapping.service';
import {
  CreateImportDto,
  BulkCandidateImportDto,
} from '../dto/create-import.dto';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    @InjectRepository(ImportJob)
    private importJobRepository: Repository<ImportJob>,
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
    @InjectRepository(JobFamily)
    private jobFamilyRepository: Repository<JobFamily>,
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
    @InjectRepository(CompanyProfile)
    private companyProfileRepository: Repository<CompanyProfile>,
    @InjectRepository(ParsedResumeData)
    private parsedResumeDataRepository: Repository<ParsedResumeData>,
    private validationService: ValidationService,
    private mappingService: MappingService,
  ) {}

  async createImportJob(
    createImportDto: CreateImportDto,
    organizationId: string,
    createdBy: string,
  ): Promise<ImportJob> {
    const importJob = this.importJobRepository.create({
      ...createImportDto,
      organizationId,
      createdBy,
      status: ImportStatus.PENDING,
    });

    return this.importJobRepository.save(importJob);
  }

  async getImportJobs(organizationId: string): Promise<ImportJob[]> {
    return this.importJobRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async getImportJob(
    id: string,
    organizationId: string,
  ): Promise<ImportJob | null> {
    return this.importJobRepository.findOne({
      where: { id, organizationId },
    });
  }

  async generateImportPreview(
    fileUrl: string,
    type: ImportType,
    fieldMapping?: Record<string, string>,
  ): Promise<{
    headers: string[];
    preview: any[];
    detectedMapping: Record<string, string>;
    totalRecords: number;
  }> {
    const data = await this.parseFile(fileUrl);

    if (data.length === 0) {
      throw new Error('File is empty or could not be parsed');
    }

    const headers = Object.keys(data[0]);
    const detectedMapping =
      fieldMapping || this.mappingService.detectFieldMapping(headers, type);

    // Transform preview data using mapping
    const preview = data
      .slice(0, 10)
      .map((record) =>
        this.mappingService.transformRecord(record, detectedMapping),
      );

    return {
      headers,
      preview,
      detectedMapping,
      totalRecords: data.length,
    };
  }

  async processImportJob(importJobId: string): Promise<void> {
    const importJob = await this.importJobRepository.findOne({
      where: { id: importJobId },
    });

    if (!importJob) {
      throw new Error('Import job not found');
    }

    try {
      await this.updateImportJobStatus(importJobId, ImportStatus.PROCESSING);

      const data = await this.parseFile(importJob.fileUrl);
      await this.updateImportJob(importJobId, {
        totalRecords: data.length,
        startedAt: new Date(),
      });

      let validationResult: ValidationResult;
      const fieldMapping = importJob.fieldMapping || {};

      // Validate data based on import type
      switch (importJob.type) {
        case ImportType.CANDIDATES:
          validationResult = await this.validationService.validateCandidateData(
            data,
            fieldMapping,
          );
          break;
        case ImportType.JOBS:
          validationResult = await this.validationService.validateJobData(
            data,
            fieldMapping,
          );
          break;
        case ImportType.APPLICATIONS:
          validationResult =
            await this.validationService.validateApplicationData(
              data,
              fieldMapping,
            );
          break;
        default:
          throw new Error(`Unsupported import type: ${importJob.type}`);
      }

      // Update job with validation results
      await this.updateImportJob(importJobId, {
        errors: validationResult.errors,
        failedRecords: validationResult.invalidRecords.length,
      });

      // Process valid records
      let successfulRecords = 0;
      for (const record of validationResult.validRecords) {
        try {
          const transformedRecord = this.mappingService.transformRecord(
            record,
            fieldMapping,
          );
          await this.importRecord(
            transformedRecord,
            importJob.type,
            importJob.organizationId,
          );
          successfulRecords++;
        } catch (error) {
          this.logger.error(
            `Failed to import record: ${error.message}`,
            error.stack,
          );
          validationResult.errors.push({
            row: validationResult.validRecords.indexOf(record) + 1,
            message: error.message,
            data: record,
          });
        }
      }

      await this.updateImportJob(importJobId, {
        processedRecords: data.length,
        successfulRecords,
        failedRecords: data.length - successfulRecords,
        status: ImportStatus.COMPLETED,
        completedAt: new Date(),
        errors: validationResult.errors,
      });
    } catch (error) {
      this.logger.error(`Import job failed: ${error.message}`, error.stack);
      await this.updateImportJob(importJobId, {
        status: ImportStatus.FAILED,
        errors: [
          {
            row: 0,
            message: error.message,
          },
        ],
        completedAt: new Date(),
      });
    }
  }

  async bulkImportCandidates(
    bulkImportDto: BulkCandidateImportDto,
    organizationId: string,
  ): Promise<{
    successful: number;
    failed: number;
    errors: any[];
  }> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (let i = 0; i < bulkImportDto.candidates.length; i++) {
      const candidateData = bulkImportDto.candidates[i];

      try {
        // Check if candidate already exists
        const existingCandidate = await this.candidateRepository.findOne({
          where: { email: candidateData.email, organizationId },
        });

        if (existingCandidate) {
          results.errors.push({
            index: i,
            email: candidateData.email,
            message: 'Candidate with this email already exists',
          });
          results.failed++;
          continue;
        }

        // Create candidate
        const candidate = this.candidateRepository.create({
          ...candidateData,
          organizationId,
          source: candidateData.source || bulkImportDto.source || 'bulk_import',
          consentGiven: true,
          consentDate: new Date(),
        });

        const savedCandidate = await this.candidateRepository.save(candidate);

        // Create parsed resume data if skills are provided
        if (candidateData.skills && candidateData.skills.length > 0) {
          const parsedData = this.parsedResumeDataRepository.create({
            candidateId: savedCandidate.id,
            skills: candidateData.skills.map((skill) => ({
              name: skill,
              category: 'technical', // default category
              yearsOfExperience: 0,
            })),
            experience: [],
            education: [],
            certifications: [],
            totalExperience: candidateData.experience || 0,
          });

          await this.parsedResumeDataRepository.save(parsedData);
        }

        results.successful++;
      } catch (error) {
        this.logger.error(
          `Failed to import candidate ${candidateData.email}: ${error.message}`,
        );
        results.errors.push({
          index: i,
          email: candidateData.email,
          message: error.message,
        });
        results.failed++;
      }
    }

    return results;
  }

  private async parseFile(fileUrl: string): Promise<any[]> {
    // In a real implementation, you would fetch the file from the URL
    // For now, we'll simulate parsing

    const fileExtension = fileUrl.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      return this.parseCsvFile(fileUrl);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      return this.parseExcelFile(fileUrl);
    } else {
      throw new Error(
        'Unsupported file format. Please use CSV or Excel files.',
      );
    }
  }

  private async parseCsvFile(fileUrl: string): Promise<any[]> {
    // In production, you would fetch the file content from the URL
    // This is a simplified implementation
    return new Promise((resolve, reject) => {
      const results: any[] = [];

      // Simulate CSV parsing - in production, you'd use the actual file content
      // For now, return empty array as placeholder
      resolve(results);
    });
  }

  private async parseExcelFile(fileUrl: string): Promise<any[]> {
    // In production, you would fetch the file content from the URL
    // This is a simplified implementation
    try {
      // Simulate Excel parsing - in production, you'd use the actual file content
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
  }

  private async importRecord(
    record: any,
    type: ImportType,
    organizationId: string,
  ): Promise<void> {
    switch (type) {
      case ImportType.CANDIDATES:
        await this.importCandidate(record, organizationId);
        break;
      case ImportType.JOBS:
        await this.importJob(record, organizationId);
        break;
      case ImportType.APPLICATIONS:
        await this.importApplication(record, organizationId);
        break;
      case ImportType.COMPANIES:
        await this.importCompany(record, organizationId);
        break;
      default:
        throw new Error(`Unsupported import type: ${type}`);
    }
  }

  private async importCandidate(
    record: any,
    organizationId: string,
  ): Promise<void> {
    // Check for duplicates
    const existingCandidate = await this.candidateRepository.findOne({
      where: { email: record.email, organizationId },
    });

    if (existingCandidate) {
      throw new Error(`Candidate with email ${record.email} already exists`);
    }

    const candidate = this.candidateRepository.create({
      ...record,
      organizationId,
      consentGiven: true,
      consentDate: new Date(),
    });

    await this.candidateRepository.save(candidate);
  }

  private async importJob(record: any, organizationId: string): Promise<void> {
    // Validate job family exists
    const jobFamily = await this.jobFamilyRepository.findOne({
      where: { id: record.jobFamilyId, organizationId },
    });

    if (!jobFamily) {
      throw new Error(`Job family with ID ${record.jobFamilyId} not found`);
    }

    // Import logic would go here
    // This is a placeholder for the actual job import implementation
  }

  private async importApplication(
    record: any,
    organizationId: string,
  ): Promise<void> {
    // Validate candidate and job variant exist
    const candidate = await this.candidateRepository.findOne({
      where: { id: record.candidateId, organizationId },
    });

    if (!candidate) {
      throw new Error(`Candidate with ID ${record.candidateId} not found`);
    }

    // Import logic would go here
    // This is a placeholder for the actual application import implementation
  }

  private async importCompany(
    record: any,
    organizationId: string,
  ): Promise<void> {
    // Check for duplicates
    const existingCompany = await this.companyProfileRepository.findOne({
      where: { name: record.name, organizationId },
    });

    if (existingCompany) {
      throw new Error(`Company with name ${record.name} already exists`);
    }

    const company = this.companyProfileRepository.create({
      ...record,
      organizationId,
    });

    await this.companyProfileRepository.save(company);
  }

  private async updateImportJobStatus(
    id: string,
    status: ImportStatus,
  ): Promise<void> {
    await this.importJobRepository.update(id, { status });
  }

  private async updateImportJob(
    id: string,
    updates: Partial<ImportJob>,
  ): Promise<void> {
    await this.importJobRepository.update(id, updates);
  }

  async cancelImportJob(id: string, organizationId: string): Promise<void> {
    await this.importJobRepository.update(
      { id, organizationId },
      { status: ImportStatus.CANCELLED },
    );
  }

  async deleteImportJob(id: string, organizationId: string): Promise<void> {
    await this.importJobRepository.delete({ id, organizationId });
  }
}
