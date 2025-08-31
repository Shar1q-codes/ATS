import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ImportJob,
  ImportType,
  ImportStatus,
} from '../../entities/import-job.entity';
import { ImportService } from './import.service';
import { ValidationService } from './validation.service';
import { MappingService } from './mapping.service';
import { MigrationConfigDto } from '../dto/create-export.dto';

export interface ATSMigrationResult {
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: Array<{
    type: string;
    message: string;
    data?: any;
  }>;
  importJobs: string[]; // IDs of created import jobs
}

export interface ATSSystemConfig {
  name: string;
  apiUrl: string;
  authMethod: 'api_key' | 'oauth' | 'basic_auth';
  supportedDataTypes: ImportType[];
  fieldMappings: Record<ImportType, Record<string, string>>;
  rateLimit: {
    requestsPerSecond: number;
    requestsPerHour: number;
  };
}

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  // Predefined ATS system configurations
  private readonly atsConfigs: Record<string, ATSSystemConfig> = {
    greenhouse: {
      name: 'Greenhouse',
      apiUrl: 'https://harvest.greenhouse.io/v1',
      authMethod: 'basic_auth',
      supportedDataTypes: [
        ImportType.CANDIDATES,
        ImportType.JOBS,
        ImportType.APPLICATIONS,
      ],
      fieldMappings: {
        [ImportType.CANDIDATES]: {
          'email_addresses[0].value': 'email',
          first_name: 'firstName',
          last_name: 'lastName',
          'phone_numbers[0].value': 'phone',
          'addresses[0].value': 'location',
          'website_addresses[0].value': 'portfolioUrl',
          'social_media_addresses[0].value': 'linkedinUrl',
          'custom_fields.source': 'source',
        },
        [ImportType.JOBS]: {
          name: 'name',
          'departments[0].name': 'department',
          'offices[0].name': 'location',
          status: 'status',
          created_at: 'createdAt',
        },
        [ImportType.APPLICATIONS]: {
          'candidate.email_addresses[0].value': 'candidateEmail',
          'jobs[0].name': 'jobTitle',
          status: 'status',
          applied_at: 'appliedAt',
          'source.public_name': 'source',
        },
        [ImportType.COMPANIES]: {},
      },
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerHour: 1000,
      },
    },
    lever: {
      name: 'Lever',
      apiUrl: 'https://api.lever.co/v1',
      authMethod: 'api_key',
      supportedDataTypes: [
        ImportType.CANDIDATES,
        ImportType.JOBS,
        ImportType.APPLICATIONS,
      ],
      fieldMappings: {
        [ImportType.CANDIDATES]: {
          'emails[0]': 'email',
          name: 'fullName',
          'phones[0].value': 'phone',
          location: 'location',
          'links[0]': 'linkedinUrl',
          'sources[0]': 'source',
        },
        [ImportType.JOBS]: {
          text: 'name',
          'categories.department': 'department',
          'categories.location': 'location',
          state: 'status',
          createdAt: 'createdAt',
        },
        [ImportType.APPLICATIONS]: {
          'candidate.emails[0]': 'candidateEmail',
          'posting.text': 'jobTitle',
          stage: 'status',
          createdAt: 'appliedAt',
          source: 'source',
        },
        [ImportType.COMPANIES]: {},
      },
      rateLimit: {
        requestsPerSecond: 5,
        requestsPerHour: 500,
      },
    },
    workday: {
      name: 'Workday',
      apiUrl: 'https://api.workday.com/v1',
      authMethod: 'oauth',
      supportedDataTypes: [ImportType.CANDIDATES, ImportType.JOBS],
      fieldMappings: {
        [ImportType.CANDIDATES]: {
          'personalData.emailAddress': 'email',
          'personalData.legalName.firstName': 'firstName',
          'personalData.legalName.lastName': 'lastName',
          'personalData.phoneNumber': 'phone',
          'personalData.address': 'location',
        },
        [ImportType.JOBS]: {
          jobTitle: 'name',
          jobFamily: 'department',
          location: 'location',
          jobStatus: 'status',
          createdDate: 'createdAt',
        },
        [ImportType.APPLICATIONS]: {},
        [ImportType.COMPANIES]: {},
      },
      rateLimit: {
        requestsPerSecond: 2,
        requestsPerHour: 200,
      },
    },
    bamboohr: {
      name: 'BambooHR',
      apiUrl: 'https://api.bamboohr.com/api/gateway.php',
      authMethod: 'api_key',
      supportedDataTypes: [ImportType.CANDIDATES],
      fieldMappings: {
        [ImportType.CANDIDATES]: {
          workEmail: 'email',
          firstName: 'firstName',
          lastName: 'lastName',
          mobilePhone: 'phone',
          city: 'location',
        },
        [ImportType.JOBS]: {},
        [ImportType.APPLICATIONS]: {},
        [ImportType.COMPANIES]: {},
      },
      rateLimit: {
        requestsPerSecond: 1,
        requestsPerHour: 100,
      },
    },
  };

  constructor(
    @InjectRepository(ImportJob)
    private importJobRepository: Repository<ImportJob>,
    private importService: ImportService,
    private validationService: ValidationService,
    private mappingService: MappingService,
  ) {}

  async migrateFromATS(
    migrationConfig: MigrationConfigDto,
    organizationId: string,
    createdBy: string,
  ): Promise<ATSMigrationResult> {
    const result: ATSMigrationResult = {
      totalRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      errors: [],
      importJobs: [],
    };

    try {
      const atsConfig =
        this.atsConfigs[migrationConfig.sourceSystem.toLowerCase()];
      if (!atsConfig) {
        throw new Error(
          `Unsupported ATS system: ${migrationConfig.sourceSystem}`,
        );
      }

      this.logger.log(
        `Starting migration from ${atsConfig.name} for organization ${organizationId}`,
      );

      // Validate data types are supported
      for (const dataType of migrationConfig.dataTypes) {
        if (!atsConfig.supportedDataTypes.includes(dataType as ImportType)) {
          result.errors.push({
            type: 'unsupported_data_type',
            message: `${atsConfig.name} does not support ${dataType} migration`,
          });
        }
      }

      if (result.errors.length > 0) {
        return result;
      }

      // Process each data type
      for (const dataType of migrationConfig.dataTypes) {
        try {
          const importType = dataType as ImportType;
          const migrationResult = await this.migrateDataType(
            atsConfig,
            migrationConfig,
            importType,
            organizationId,
            createdBy,
          );

          result.totalRecords += migrationResult.totalRecords;
          result.successfulRecords += migrationResult.successfulRecords;
          result.failedRecords += migrationResult.failedRecords;
          result.errors.push(...migrationResult.errors);
          result.importJobs.push(...migrationResult.importJobs);
        } catch (error) {
          this.logger.error(
            `Failed to migrate ${dataType}: ${error.message}`,
            error.stack,
          );
          result.errors.push({
            type: 'migration_error',
            message: `Failed to migrate ${dataType}: ${error.message}`,
          });
        }
      }

      this.logger.log(
        `Migration completed. Total: ${result.totalRecords}, Success: ${result.successfulRecords}, Failed: ${result.failedRecords}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Migration failed: ${error.message}`, error.stack);
      result.errors.push({
        type: 'migration_error',
        message: error.message,
      });
      return result;
    }
  }

  private async migrateDataType(
    atsConfig: ATSSystemConfig,
    migrationConfig: MigrationConfigDto,
    importType: ImportType,
    organizationId: string,
    createdBy: string,
  ): Promise<ATSMigrationResult> {
    const result: ATSMigrationResult = {
      totalRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      errors: [],
      importJobs: [],
    };

    try {
      // Fetch data from ATS
      const atsData = await this.fetchATSData(
        atsConfig,
        migrationConfig,
        importType,
      );

      if (atsData.length === 0) {
        this.logger.warn(`No ${importType} data found in ${atsConfig.name}`);
        return result;
      }

      result.totalRecords = atsData.length;

      // Transform data using field mapping
      const fieldMapping = atsConfig.fieldMappings[importType];
      const transformedData = atsData.map((record) =>
        this.mappingService.transformRecord(record, fieldMapping),
      );

      // Validate transformed data
      let validationResult;
      switch (importType) {
        case ImportType.CANDIDATES:
          validationResult = await this.validationService.validateCandidateData(
            transformedData,
            fieldMapping,
          );
          break;
        case ImportType.JOBS:
          validationResult = await this.validationService.validateJobData(
            transformedData,
            fieldMapping,
          );
          break;
        case ImportType.APPLICATIONS:
          validationResult =
            await this.validationService.validateApplicationData(
              transformedData,
              fieldMapping,
            );
          break;
        default:
          throw new Error(`Validation not implemented for ${importType}`);
      }

      // Create import job for valid records
      if (validationResult.validRecords.length > 0) {
        const importJob = await this.importService.createImportJob(
          {
            filename: `${atsConfig.name.toLowerCase()}-${importType}-migration.json`,
            fileUrl: await this.createTempFile(validationResult.validRecords),
            type: importType,
            fieldMapping,
          },
          organizationId,
          createdBy,
        );

        result.importJobs.push(importJob.id);

        // Process the import job
        await this.importService.processImportJob(importJob.id);

        // Get final results
        const processedJob = await this.importService.getImportJob(
          importJob.id,
          organizationId,
        );
        if (processedJob) {
          result.successfulRecords = processedJob.successfulRecords;
          result.failedRecords = processedJob.failedRecords;
        }
      }

      // Add validation errors to result
      result.errors.push(
        ...validationResult.errors.map((error) => ({
          type: 'validation_error',
          message: error.message,
          data: error.data,
        })),
      );

      return result;
    } catch (error) {
      result.errors.push({
        type: 'migration_error',
        message: error.message,
      });
      return result;
    }
  }

  private async fetchATSData(
    atsConfig: ATSSystemConfig,
    migrationConfig: MigrationConfigDto,
    importType: ImportType,
  ): Promise<any[]> {
    // This is a simplified implementation
    // In production, you would implement actual API calls to each ATS system

    const endpoint = this.getATSEndpoint(atsConfig, importType);
    const headers = this.getATSHeaders(atsConfig, migrationConfig);

    try {
      // Simulate API call - in production, use actual HTTP client
      this.logger.log(
        `Fetching ${importType} data from ${atsConfig.name} at ${endpoint}`,
      );

      // Make actual API call to external ATS
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.getATSHeaders(atsConfig, migrationConfig),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      this.logger.error(
        `Failed to fetch data from ${atsConfig.name}: ${error.message}`,
      );
      throw error;
    }
  }

  private getATSEndpoint(
    atsConfig: ATSSystemConfig,
    importType: ImportType,
  ): string {
    const baseUrl = atsConfig.apiUrl;

    switch (atsConfig.name.toLowerCase()) {
      case 'greenhouse':
        switch (importType) {
          case ImportType.CANDIDATES:
            return `${baseUrl}/candidates`;
          case ImportType.JOBS:
            return `${baseUrl}/jobs`;
          case ImportType.APPLICATIONS:
            return `${baseUrl}/applications`;
          default:
            throw new Error(
              `Unsupported import type for Greenhouse: ${importType}`,
            );
        }

      case 'lever':
        switch (importType) {
          case ImportType.CANDIDATES:
            return `${baseUrl}/candidates`;
          case ImportType.JOBS:
            return `${baseUrl}/postings`;
          case ImportType.APPLICATIONS:
            return `${baseUrl}/opportunities`;
          default:
            throw new Error(`Unsupported import type for Lever: ${importType}`);
        }

      case 'workday':
        switch (importType) {
          case ImportType.CANDIDATES:
            return `${baseUrl}/candidates`;
          case ImportType.JOBS:
            return `${baseUrl}/jobPostings`;
          default:
            throw new Error(
              `Unsupported import type for Workday: ${importType}`,
            );
        }

      default:
        throw new Error(
          `Endpoint mapping not implemented for ${atsConfig.name}`,
        );
    }
  }

  private getATSHeaders(
    atsConfig: ATSSystemConfig,
    migrationConfig: MigrationConfigDto,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AI-Native-ATS-Migration/1.0',
    };

    switch (atsConfig.authMethod) {
      case 'api_key':
        headers['Authorization'] = `Bearer ${migrationConfig.apiKey}`;
        break;
      case 'basic_auth':
        const credentials = Buffer.from(`${migrationConfig.apiKey}:`).toString(
          'base64',
        );
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'oauth':
        headers['Authorization'] = `Bearer ${migrationConfig.apiKey}`;
        break;
    }

    return headers;
  }

  private async createTempFile(data: any[]): Promise<string> {
    // Create temporary file for migration data
    const filename = `temp-migration-${Date.now()}.json`;
    const filePath = `/tmp/${filename}`;

    try {
      await require('fs').promises.writeFile(
        filePath,
        JSON.stringify(data, null, 2),
      );
      return filePath;
    } catch (error) {
      this.logger.error(`Failed to create temp file: ${error.message}`);
      throw new Error('Failed to create temporary migration file');
    }
  }

  async getSupportedATSSystems(): Promise<
    Array<{
      name: string;
      supportedDataTypes: ImportType[];
      authMethod: string;
      rateLimit: any;
    }>
  > {
    return Object.entries(this.atsConfigs).map(([key, config]) => ({
      name: config.name,
      supportedDataTypes: config.supportedDataTypes,
      authMethod: config.authMethod,
      rateLimit: config.rateLimit,
    }));
  }

  async validateATSConnection(migrationConfig: MigrationConfigDto): Promise<{
    isValid: boolean;
    message: string;
    supportedDataTypes?: ImportType[];
  }> {
    try {
      const atsConfig =
        this.atsConfigs[migrationConfig.sourceSystem.toLowerCase()];
      if (!atsConfig) {
        return {
          isValid: false,
          message: `Unsupported ATS system: ${migrationConfig.sourceSystem}`,
        };
      }

      // Validate API credentials by making a test call
      if (!migrationConfig.apiKey) {
        return {
          isValid: false,
          message: 'API key is required',
        };
      }

      try {
        // Make a simple test API call to validate credentials
        const testEndpoint = this.getATSEndpoint(
          atsConfig,
          ImportType.CANDIDATES,
        );
        const response = await fetch(testEndpoint, {
          method: 'HEAD', // Use HEAD to minimize data transfer
          headers: this.getATSHeaders(atsConfig, migrationConfig),
        });

        if (response.ok || response.status === 405) {
          // 405 = Method Not Allowed is acceptable
          return {
            isValid: true,
            message: 'Connection validated successfully',
            supportedDataTypes: atsConfig.supportedDataTypes,
          };
        } else {
          return {
            isValid: false,
            message: `Authentication failed: HTTP ${response.status}`,
          };
        }
      } catch (error) {
        return {
          isValid: false,
          message: `Connection failed: ${error.message}`,
        };
      }
    } catch (error) {
      return {
        isValid: false,
        message: error.message,
      };
    }
  }

  async estimateMigrationTime(migrationConfig: MigrationConfigDto): Promise<{
    estimatedDuration: number; // in minutes
    estimatedRecords: number;
    breakdown: Record<string, { records: number; duration: number }>;
  }> {
    const atsConfig =
      this.atsConfigs[migrationConfig.sourceSystem.toLowerCase()];
    if (!atsConfig) {
      throw new Error(
        `Unsupported ATS system: ${migrationConfig.sourceSystem}`,
      );
    }

    const breakdown: Record<string, { records: number; duration: number }> = {};
    let totalRecords = 0;
    let totalDuration = 0;

    for (const dataType of migrationConfig.dataTypes) {
      // Estimate based on typical ATS data volumes
      let estimatedRecords = 0;
      switch (dataType) {
        case 'candidates':
          estimatedRecords = 1000; // Typical small-medium company
          break;
        case 'jobs':
          estimatedRecords = 50;
          break;
        case 'applications':
          estimatedRecords = 2000;
          break;
        default:
          estimatedRecords = 100;
      }

      // Calculate duration based on rate limits and processing time
      const apiCallsNeeded = Math.ceil(estimatedRecords / 100); // Assume 100 records per API call
      const apiDuration =
        apiCallsNeeded / atsConfig.rateLimit.requestsPerSecond;
      const processingDuration = estimatedRecords * 0.01; // 0.01 seconds per record
      const duration = Math.ceil(apiDuration + processingDuration);

      breakdown[dataType] = {
        records: estimatedRecords,
        duration,
      };

      totalRecords += estimatedRecords;
      totalDuration += duration;
    }

    return {
      estimatedDuration: Math.ceil(totalDuration / 60), // Convert to minutes
      estimatedRecords: totalRecords,
      breakdown,
    };
  }
}
