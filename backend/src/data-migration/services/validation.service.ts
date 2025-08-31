import { Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

export interface ValidationError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  validRecords: any[];
  invalidRecords: any[];
}

@Injectable()
export class ValidationService {
  async validateCandidateData(
    records: any[],
    fieldMapping: Record<string, string>,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const validRecords: any[] = [];
    const invalidRecords: any[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 1;
      const recordErrors: ValidationError[] = [];

      // Validate required fields
      const requiredFields = ['email', 'firstName', 'lastName'];
      for (const field of requiredFields) {
        const sourceField = this.getSourceField(field, fieldMapping);
        if (
          !record[sourceField] ||
          record[sourceField].toString().trim() === ''
        ) {
          recordErrors.push({
            row: rowNumber,
            field: sourceField,
            message: `${field} is required`,
            data: record,
          });
        }
      }

      // Validate email format
      const emailField = this.getSourceField('email', fieldMapping);
      if (record[emailField]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(record[emailField])) {
          recordErrors.push({
            row: rowNumber,
            field: emailField,
            message: 'Invalid email format',
            data: record,
          });
        }
      }

      // Validate phone format (if provided)
      const phoneField = this.getSourceField('phone', fieldMapping);
      if (record[phoneField]) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(record[phoneField].replace(/[\s\-\(\)]/g, ''))) {
          recordErrors.push({
            row: rowNumber,
            field: phoneField,
            message: 'Invalid phone format',
            data: record,
          });
        }
      }

      // Validate URL format (if provided)
      const linkedinField = this.getSourceField('linkedinUrl', fieldMapping);
      if (record[linkedinField]) {
        try {
          new URL(record[linkedinField]);
        } catch {
          recordErrors.push({
            row: rowNumber,
            field: linkedinField,
            message: 'Invalid URL format',
            data: record,
          });
        }
      }

      // Validate experience (if provided)
      const experienceField = this.getSourceField(
        'totalExperience',
        fieldMapping,
      );
      if (
        record[experienceField] !== undefined &&
        record[experienceField] !== ''
      ) {
        const experience = Number(record[experienceField]);
        if (isNaN(experience) || experience < 0 || experience > 50) {
          recordErrors.push({
            row: rowNumber,
            field: experienceField,
            message: 'Experience must be a number between 0 and 50',
            data: record,
          });
        }
      }

      if (recordErrors.length > 0) {
        errors.push(...recordErrors);
        invalidRecords.push(record);
      } else {
        validRecords.push(record);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      validRecords,
      invalidRecords,
    };
  }

  async validateJobData(
    records: any[],
    fieldMapping: Record<string, string>,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const validRecords: any[] = [];
    const invalidRecords: any[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 1;
      const recordErrors: ValidationError[] = [];

      // Validate required fields for jobs
      const requiredFields = ['name', 'jobFamilyId'];
      for (const field of requiredFields) {
        const sourceField = this.getSourceField(field, fieldMapping);
        if (
          !record[sourceField] ||
          record[sourceField].toString().trim() === ''
        ) {
          recordErrors.push({
            row: rowNumber,
            field: sourceField,
            message: `${field} is required`,
            data: record,
          });
        }
      }

      // Validate level enum
      const levelField = this.getSourceField('level', fieldMapping);
      if (record[levelField]) {
        const validLevels = ['junior', 'mid', 'senior', 'lead', 'principal'];
        if (!validLevels.includes(record[levelField].toLowerCase())) {
          recordErrors.push({
            row: rowNumber,
            field: levelField,
            message: `Level must be one of: ${validLevels.join(', ')}`,
            data: record,
          });
        }
      }

      // Validate salary range
      const minSalaryField = this.getSourceField('minSalary', fieldMapping);
      const maxSalaryField = this.getSourceField('maxSalary', fieldMapping);
      if (record[minSalaryField] && record[maxSalaryField]) {
        const minSalary = Number(record[minSalaryField]);
        const maxSalary = Number(record[maxSalaryField]);
        if (isNaN(minSalary) || isNaN(maxSalary) || minSalary >= maxSalary) {
          recordErrors.push({
            row: rowNumber,
            field: `${minSalaryField}, ${maxSalaryField}`,
            message: 'Invalid salary range: min must be less than max',
            data: record,
          });
        }
      }

      if (recordErrors.length > 0) {
        errors.push(...recordErrors);
        invalidRecords.push(record);
      } else {
        validRecords.push(record);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      validRecords,
      invalidRecords,
    };
  }

  async validateApplicationData(
    records: any[],
    fieldMapping: Record<string, string>,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const validRecords: any[] = [];
    const invalidRecords: any[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 1;
      const recordErrors: ValidationError[] = [];

      // Validate required fields for applications
      const requiredFields = ['candidateId', 'companyJobVariantId'];
      for (const field of requiredFields) {
        const sourceField = this.getSourceField(field, fieldMapping);
        if (
          !record[sourceField] ||
          record[sourceField].toString().trim() === ''
        ) {
          recordErrors.push({
            row: rowNumber,
            field: sourceField,
            message: `${field} is required`,
            data: record,
          });
        }
      }

      // Validate status enum
      const statusField = this.getSourceField('status', fieldMapping);
      if (record[statusField]) {
        const validStatuses = [
          'applied',
          'screening',
          'shortlisted',
          'interview_scheduled',
          'interview_completed',
          'offer_extended',
          'offer_accepted',
          'hired',
          'rejected',
        ];
        if (!validStatuses.includes(record[statusField].toLowerCase())) {
          recordErrors.push({
            row: rowNumber,
            field: statusField,
            message: `Status must be one of: ${validStatuses.join(', ')}`,
            data: record,
          });
        }
      }

      // Validate fit score
      const fitScoreField = this.getSourceField('fitScore', fieldMapping);
      if (record[fitScoreField] !== undefined && record[fitScoreField] !== '') {
        const fitScore = Number(record[fitScoreField]);
        if (isNaN(fitScore) || fitScore < 0 || fitScore > 100) {
          recordErrors.push({
            row: rowNumber,
            field: fitScoreField,
            message: 'Fit score must be a number between 0 and 100',
            data: record,
          });
        }
      }

      if (recordErrors.length > 0) {
        errors.push(...recordErrors);
        invalidRecords.push(record);
      } else {
        validRecords.push(record);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      validRecords,
      invalidRecords,
    };
  }

  private getSourceField(
    targetField: string,
    fieldMapping: Record<string, string>,
  ): string {
    // Find the source field that maps to the target field
    for (const [source, target] of Object.entries(fieldMapping)) {
      if (target === targetField) {
        return source;
      }
    }
    // If no mapping found, assume source field has the same name as target
    return targetField;
  }

  generateValidationReport(result: ValidationResult): string {
    const { errors, validRecords, invalidRecords } = result;

    let report = `Validation Report\n`;
    report += `================\n\n`;
    report += `Total Records: ${validRecords.length + invalidRecords.length}\n`;
    report += `Valid Records: ${validRecords.length}\n`;
    report += `Invalid Records: ${invalidRecords.length}\n`;
    report += `Total Errors: ${errors.length}\n\n`;

    if (errors.length > 0) {
      report += `Errors:\n`;
      report += `-------\n`;
      errors.forEach((error, index) => {
        report += `${index + 1}. Row ${error.row}`;
        if (error.field) {
          report += ` - Field: ${error.field}`;
        }
        report += ` - ${error.message}\n`;
      });
    }

    return report;
  }
}
