import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import * as XLSX from 'xlsx';
import {
  ExportJob,
  ExportStatus,
  ExportType,
  ExportFormat,
} from '../../entities/export-job.entity';
import { Candidate } from '../../entities/candidate.entity';
import { JobFamily } from '../../entities/job-family.entity';
import { Application } from '../../entities/application.entity';
import { CompanyProfile } from '../../entities/company-profile.entity';
import { CreateExportDto } from '../dto/create-export.dto';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    @InjectRepository(ExportJob)
    private exportJobRepository: Repository<ExportJob>,
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
    @InjectRepository(JobFamily)
    private jobFamilyRepository: Repository<JobFamily>,
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
    @InjectRepository(CompanyProfile)
    private companyProfileRepository: Repository<CompanyProfile>,
  ) {}

  async createExportJob(
    createExportDto: CreateExportDto,
    organizationId: string,
    createdBy: string,
  ): Promise<ExportJob> {
    const exportJob = this.exportJobRepository.create({
      ...createExportDto,
      organizationId,
      createdBy,
      status: ExportStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });

    return this.exportJobRepository.save(exportJob);
  }

  async getExportJobs(organizationId: string): Promise<ExportJob[]> {
    return this.exportJobRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async getExportJob(
    id: string,
    organizationId: string,
  ): Promise<ExportJob | null> {
    return this.exportJobRepository.findOne({
      where: { id, organizationId },
    });
  }

  async processExportJob(exportJobId: string): Promise<void> {
    const exportJob = await this.exportJobRepository.findOne({
      where: { id: exportJobId },
    });

    if (!exportJob) {
      throw new Error('Export job not found');
    }

    try {
      await this.updateExportJobStatus(exportJobId, ExportStatus.PROCESSING);
      await this.updateExportJob(exportJobId, { startedAt: new Date() });

      const data = await this.extractData(exportJob);
      const fileContent = await this.generateFile(
        data,
        exportJob.format,
        exportJob.selectedFields,
      );

      // In production, you would upload the file to cloud storage and get the URL
      const fileUrl = await this.uploadFile(fileContent, exportJob);

      await this.updateExportJob(exportJobId, {
        status: ExportStatus.COMPLETED,
        fileUrl,
        fileSize: Buffer.byteLength(fileContent),
        recordCount: data.length,
        completedAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Export job failed: ${error.message}`, error.stack);
      await this.updateExportJob(exportJobId, {
        status: ExportStatus.FAILED,
        errorMessage: error.message,
        completedAt: new Date(),
      });
    }
  }

  async exportCandidatesImmediate(
    organizationId: string,
    format: ExportFormat,
    filters?: any,
    selectedFields?: string[],
  ): Promise<Buffer> {
    const data = await this.extractCandidatesData(organizationId, filters);
    return this.generateFile(data, format, selectedFields);
  }

  async exportJobsImmediate(
    organizationId: string,
    format: ExportFormat,
    filters?: any,
    selectedFields?: string[],
  ): Promise<Buffer> {
    const data = await this.extractJobsData(organizationId, filters);
    return this.generateFile(data, format, selectedFields);
  }

  async exportApplicationsImmediate(
    organizationId: string,
    format: ExportFormat,
    filters?: any,
    selectedFields?: string[],
  ): Promise<Buffer> {
    const data = await this.extractApplicationsData(organizationId, filters);
    return this.generateFile(data, format, selectedFields);
  }

  async exportFullBackup(organizationId: string): Promise<{
    candidates: any[];
    jobs: any[];
    applications: any[];
    companies: any[];
  }> {
    const [candidates, jobs, applications, companies] = await Promise.all([
      this.extractCandidatesData(organizationId),
      this.extractJobsData(organizationId),
      this.extractApplicationsData(organizationId),
      this.extractCompaniesData(organizationId),
    ]);

    return {
      candidates,
      jobs,
      applications,
      companies,
    };
  }

  private async extractData(exportJob: ExportJob): Promise<any[]> {
    switch (exportJob.type) {
      case ExportType.CANDIDATES:
        return this.extractCandidatesData(
          exportJob.organizationId,
          exportJob.filters,
        );
      case ExportType.JOBS:
        return this.extractJobsData(
          exportJob.organizationId,
          exportJob.filters,
        );
      case ExportType.APPLICATIONS:
        return this.extractApplicationsData(
          exportJob.organizationId,
          exportJob.filters,
        );
      case ExportType.COMPANIES:
        return this.extractCompaniesData(
          exportJob.organizationId,
          exportJob.filters,
        );
      case ExportType.FULL_BACKUP:
        return this.extractFullBackupData(exportJob.organizationId);
      default:
        throw new Error(`Unsupported export type: ${exportJob.type}`);
    }
  }

  private async extractCandidatesData(
    organizationId: string,
    filters?: any,
  ): Promise<any[]> {
    let query = this.candidateRepository
      .createQueryBuilder('candidate')
      .leftJoinAndSelect('candidate.parsedData', 'parsedData')
      .leftJoinAndSelect('candidate.applications', 'applications')
      .where('candidate.organizationId = :organizationId', { organizationId });

    query = this.applyCandidateFilters(query, filters);

    const candidates = await query.getMany();

    return candidates.map((candidate) => ({
      id: candidate.id,
      email: candidate.email,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      phone: candidate.phone,
      location: candidate.location,
      linkedinUrl: candidate.linkedinUrl,
      portfolioUrl: candidate.portfolioUrl,
      source: candidate.source,
      totalExperience: candidate.totalExperience,
      gender: candidate.gender,
      ethnicity: candidate.ethnicity,
      age: candidate.age,
      education: candidate.education,
      skills: candidate.parsedData?.skills?.map((s) => s.name).join(', ') || '',
      applicationCount: candidate.applications?.length || 0,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
    }));
  }

  private async extractJobsData(
    organizationId: string,
    filters?: any,
  ): Promise<any[]> {
    let query = this.jobFamilyRepository
      .createQueryBuilder('jobFamily')
      .leftJoinAndSelect('jobFamily.jobTemplates', 'jobTemplates')
      .leftJoinAndSelect('jobFamily.baseRequirements', 'baseRequirements')
      .where('jobFamily.organizationId = :organizationId', { organizationId });

    query = this.applyJobFilters(query, filters);

    const jobFamilies = await query.getMany();

    const jobs: any[] = [];

    for (const jobFamily of jobFamilies) {
      jobs.push({
        id: jobFamily.id,
        name: jobFamily.name,
        description: jobFamily.description,
        skillCategories: jobFamily.skillCategories?.join(', ') || '',
        templateCount: jobFamily.jobTemplates?.length || 0,
        requirementCount: jobFamily.baseRequirements?.length || 0,
        createdAt: jobFamily.createdAt,
        updatedAt: jobFamily.updatedAt,
      });
    }

    return jobs;
  }

  private async extractApplicationsData(
    organizationId: string,
    filters?: any,
  ): Promise<any[]> {
    let query = this.applicationRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.candidate', 'candidate')
      .leftJoinAndSelect('application.companyJobVariant', 'jobVariant')
      .leftJoinAndSelect('jobVariant.jobTemplate', 'jobTemplate')
      .leftJoinAndSelect('jobTemplate.jobFamily', 'jobFamily')
      .leftJoinAndSelect('application.matchExplanation', 'matchExplanation')
      .where('candidate.organizationId = :organizationId', { organizationId });

    query = this.applyApplicationFilters(query, filters);

    const applications = await query.getMany();

    return applications.map((application) => ({
      id: application.id,
      candidateEmail: application.candidate.email,
      candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
      jobTitle: application.companyJobVariant?.jobTemplate?.name || 'Unknown',
      jobFamily:
        application.companyJobVariant?.jobTemplate?.jobFamily?.name ||
        'Unknown',
      status: application.status,
      fitScore: application.fitScore,
      appliedAt: application.appliedAt,
      lastUpdated: application.lastUpdated,
    }));
  }

  private async extractCompaniesData(
    organizationId: string,
    filters?: any,
  ): Promise<any[]> {
    let query = this.companyProfileRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.jobVariants', 'jobVariants')
      .where('company.organizationId = :organizationId', { organizationId });

    query = this.applyCompanyFilters(query, filters);

    const companies = await query.getMany();

    return companies.map((company) => ({
      id: company.id,
      name: company.name,
      industry: company.industry,
      size: company.size,
      location: company.location,
      workArrangement: company.workArrangement,
      benefits: company.benefits?.join(', ') || '',
      culture: company.culture?.join(', ') || '',
      jobVariantCount: company.jobVariants?.length || 0,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    }));
  }

  private async extractFullBackupData(organizationId: string): Promise<any[]> {
    const backup = await this.exportFullBackup(organizationId);
    return [backup]; // Return as array for consistency
  }

  private applyCandidateFilters(
    query: SelectQueryBuilder<Candidate>,
    filters?: any,
  ): SelectQueryBuilder<Candidate> {
    if (!filters) return query;

    if (filters.dateFrom) {
      query.andWhere('candidate.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      query.andWhere('candidate.createdAt <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }

    if (filters.sources && filters.sources.length > 0) {
      query.andWhere('candidate.source IN (:...sources)', {
        sources: filters.sources,
      });
    }

    if (filters.minExperience !== undefined) {
      query.andWhere('candidate.totalExperience >= :minExperience', {
        minExperience: filters.minExperience,
      });
    }

    if (filters.maxExperience !== undefined) {
      query.andWhere('candidate.totalExperience <= :maxExperience', {
        maxExperience: filters.maxExperience,
      });
    }

    return query;
  }

  private applyJobFilters(
    query: SelectQueryBuilder<JobFamily>,
    filters?: any,
  ): SelectQueryBuilder<JobFamily> {
    if (!filters) return query;

    if (filters.dateFrom) {
      query.andWhere('jobFamily.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      query.andWhere('jobFamily.createdAt <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }

    return query;
  }

  private applyApplicationFilters(
    query: SelectQueryBuilder<Application>,
    filters?: any,
  ): SelectQueryBuilder<Application> {
    if (!filters) return query;

    if (filters.dateFrom) {
      query.andWhere('application.appliedAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      query.andWhere('application.appliedAt <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }

    if (filters.statuses && filters.statuses.length > 0) {
      query.andWhere('application.status IN (:...statuses)', {
        statuses: filters.statuses,
      });
    }

    if (filters.jobIds && filters.jobIds.length > 0) {
      query.andWhere('application.companyJobVariantId IN (:...jobIds)', {
        jobIds: filters.jobIds,
      });
    }

    return query;
  }

  private applyCompanyFilters(
    query: SelectQueryBuilder<CompanyProfile>,
    filters?: any,
  ): SelectQueryBuilder<CompanyProfile> {
    if (!filters) return query;

    if (filters.dateFrom) {
      query.andWhere('company.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      query.andWhere('company.createdAt <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }

    if (filters.industries && filters.industries.length > 0) {
      query.andWhere('company.industry IN (:...industries)', {
        industries: filters.industries,
      });
    }

    if (filters.sizes && filters.sizes.length > 0) {
      query.andWhere('company.size IN (:...sizes)', { sizes: filters.sizes });
    }

    return query;
  }

  private generateFile(
    data: any[],
    format: ExportFormat,
    selectedFields?: string[],
  ): Buffer {
    // Filter fields if specified
    let processedData = data;
    if (selectedFields && selectedFields.length > 0) {
      processedData = data.map((record) => {
        const filtered: any = {};
        selectedFields.forEach((field) => {
          if (record[field] !== undefined) {
            filtered[field] = record[field];
          }
        });
        return filtered;
      });
    }

    switch (format) {
      case ExportFormat.CSV:
        return this.generateCsvFile(processedData);
      case ExportFormat.EXCEL:
        return this.generateExcelFile(processedData);
      case ExportFormat.JSON:
        return this.generateJsonFile(processedData);
      case ExportFormat.XML:
        return this.generateXmlFile(processedData);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private generateCsvFile(data: any[]): Buffer {
    if (data.length === 0) {
      return Buffer.from('');
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const record of data) {
      const values = headers.map((header) => {
        const value = record[header];
        if (value === null || value === undefined) {
          return '';
        }
        // Escape commas and quotes in CSV
        const stringValue = String(value);
        if (
          stringValue.includes(',') ||
          stringValue.includes('"') ||
          stringValue.includes('\n')
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(','));
    }

    return Buffer.from(csvRows.join('\n'), 'utf-8');
  }

  private generateExcelFile(data: any[]): Buffer {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');

    return Buffer.from(
      XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    );
  }

  private generateJsonFile(data: any[]): Buffer {
    return Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
  }

  private generateXmlFile(data: any[]): Buffer {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<export>\n';

    for (const record of data) {
      xml += '  <record>\n';
      for (const [key, value] of Object.entries(record)) {
        const escapedValue = String(value || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
        xml += `    <${key}>${escapedValue}</${key}>\n`;
      }
      xml += '  </record>\n';
    }

    xml += '</export>';
    return Buffer.from(xml, 'utf-8');
  }

  private async uploadFile(
    content: Buffer,
    exportJob: ExportJob,
  ): Promise<string> {
    // Upload to cloud storage (S3, Google Cloud, etc.)
    const filename = `${exportJob.name}-${exportJob.id}.${exportJob.format}`;
    return await this.uploadToCloudStorage(filename, data);
  }

  private async updateExportJobStatus(
    id: string,
    status: ExportStatus,
  ): Promise<void> {
    await this.exportJobRepository.update(id, { status });
  }

  private async updateExportJob(
    id: string,
    updates: Partial<ExportJob>,
  ): Promise<void> {
    await this.exportJobRepository.update(id, updates);
  }

  async cancelExportJob(id: string, organizationId: string): Promise<void> {
    await this.exportJobRepository.update(
      { id, organizationId },
      { status: ExportStatus.CANCELLED },
    );
  }

  async deleteExportJob(id: string, organizationId: string): Promise<void> {
    await this.exportJobRepository.delete({ id, organizationId });
  }

  async cleanupExpiredExports(): Promise<void> {
    const expiredExports = await this.exportJobRepository.find({
      where: {
        expiresAt: new Date(),
        status: ExportStatus.COMPLETED,
      },
    });

    for (const exportJob of expiredExports) {
      // In production, you would also delete the file from cloud storage
      await this.exportJobRepository.delete(exportJob.id);
    }

    this.logger.log(`Cleaned up ${expiredExports.length} expired export jobs`);
  }
}
