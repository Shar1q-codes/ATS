import { Test, TestingModule } from '@nestjs/testing';
import { ValidationService } from '../services/validation.service';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationService],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  describe('validateCandidateData', () => {
    const fieldMapping = {
      Email: 'email',
      'First Name': 'firstName',
      'Last Name': 'lastName',
      Phone: 'phone',
      'LinkedIn URL': 'linkedinUrl',
      Experience: 'totalExperience',
    };

    it('should validate valid candidate data', async () => {
      const records = [
        {
          Email: 'john@example.com',
          'First Name': 'John',
          'Last Name': 'Doe',
          Phone: '+1234567890',
          'LinkedIn URL': 'https://linkedin.com/in/johndoe',
          Experience: '5',
        },
        {
          Email: 'jane@example.com',
          'First Name': 'Jane',
          'Last Name': 'Smith',
          Phone: '123-456-7890',
          Experience: '3',
        },
      ];

      const result = await service.validateCandidateData(records, fieldMapping);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.validRecords).toHaveLength(2);
      expect(result.invalidRecords).toHaveLength(0);
    });

    it('should detect missing required fields', async () => {
      const records = [
        {
          Email: 'john@example.com',
          'First Name': 'John',
          // Missing Last Name
        },
        {
          // Missing Email
          'First Name': 'Jane',
          'Last Name': 'Smith',
        },
      ];

      const result = await service.validateCandidateData(records, fieldMapping);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.validRecords).toHaveLength(0);
      expect(result.invalidRecords).toHaveLength(2);

      expect(result.errors[0].row).toBe(1);
      expect(result.errors[0].message).toContain('lastName is required');
      expect(result.errors[1].row).toBe(2);
      expect(result.errors[1].message).toContain('email is required');
    });

    it('should detect invalid email format', async () => {
      const records = [
        {
          Email: 'invalid-email',
          'First Name': 'John',
          'Last Name': 'Doe',
        },
        {
          Email: 'another@invalid@email.com',
          'First Name': 'Jane',
          'Last Name': 'Smith',
        },
      ];

      const result = await service.validateCandidateData(records, fieldMapping);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].message).toContain('Invalid email format');
      expect(result.errors[1].message).toContain('Invalid email format');
    });

    it('should detect invalid phone format', async () => {
      const records = [
        {
          Email: 'john@example.com',
          'First Name': 'John',
          'Last Name': 'Doe',
          Phone: 'invalid-phone',
        },
      ];

      const result = await service.validateCandidateData(records, fieldMapping);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid phone format');
    });

    it('should detect invalid URL format', async () => {
      const records = [
        {
          Email: 'john@example.com',
          'First Name': 'John',
          'Last Name': 'Doe',
          'LinkedIn URL': 'not-a-url',
        },
      ];

      const result = await service.validateCandidateData(records, fieldMapping);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid URL format');
    });

    it('should detect invalid experience values', async () => {
      const records = [
        {
          Email: 'john@example.com',
          'First Name': 'John',
          'Last Name': 'Doe',
          Experience: 'not-a-number',
        },
        {
          Email: 'jane@example.com',
          'First Name': 'Jane',
          'Last Name': 'Smith',
          Experience: '-5',
        },
        {
          Email: 'bob@example.com',
          'First Name': 'Bob',
          'Last Name': 'Johnson',
          Experience: '100',
        },
      ];

      const result = await service.validateCandidateData(records, fieldMapping);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors[0].message).toContain(
        'Experience must be a number between 0 and 50',
      );
      expect(result.errors[1].message).toContain(
        'Experience must be a number between 0 and 50',
      );
      expect(result.errors[2].message).toContain(
        'Experience must be a number between 0 and 50',
      );
    });
  });

  describe('validateJobData', () => {
    const fieldMapping = {
      'Job Title': 'name',
      'Job Family ID': 'jobFamilyId',
      Level: 'level',
      'Min Salary': 'minSalary',
      'Max Salary': 'maxSalary',
    };

    it('should validate valid job data', async () => {
      const records = [
        {
          'Job Title': 'Senior Software Engineer',
          'Job Family ID': 'job-family-123',
          Level: 'senior',
          'Min Salary': '80000',
          'Max Salary': '120000',
        },
      ];

      const result = await service.validateJobData(records, fieldMapping);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.validRecords).toHaveLength(1);
    });

    it('should detect missing required fields', async () => {
      const records = [
        {
          'Job Title': 'Software Engineer',
          // Missing Job Family ID
        },
      ];

      const result = await service.validateJobData(records, fieldMapping);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('jobFamilyId is required');
    });

    it('should detect invalid level values', async () => {
      const records = [
        {
          'Job Title': 'Software Engineer',
          'Job Family ID': 'job-family-123',
          Level: 'invalid-level',
        },
      ];

      const result = await service.validateJobData(records, fieldMapping);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Level must be one of');
    });

    it('should detect invalid salary range', async () => {
      const records = [
        {
          'Job Title': 'Software Engineer',
          'Job Family ID': 'job-family-123',
          'Min Salary': '120000',
          'Max Salary': '80000', // Max less than min
        },
      ];

      const result = await service.validateJobData(records, fieldMapping);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid salary range');
    });
  });

  describe('validateApplicationData', () => {
    const fieldMapping = {
      'Candidate ID': 'candidateId',
      'Job Variant ID': 'companyJobVariantId',
      Status: 'status',
      'Fit Score': 'fitScore',
    };

    it('should validate valid application data', async () => {
      const records = [
        {
          'Candidate ID': 'candidate-123',
          'Job Variant ID': 'job-variant-123',
          Status: 'applied',
          'Fit Score': '85',
        },
      ];

      const result = await service.validateApplicationData(
        records,
        fieldMapping,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.validRecords).toHaveLength(1);
    });

    it('should detect missing required fields', async () => {
      const records = [
        {
          'Candidate ID': 'candidate-123',
          // Missing Job Variant ID
        },
      ];

      const result = await service.validateApplicationData(
        records,
        fieldMapping,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain(
        'companyJobVariantId is required',
      );
    });

    it('should detect invalid status values', async () => {
      const records = [
        {
          'Candidate ID': 'candidate-123',
          'Job Variant ID': 'job-variant-123',
          Status: 'invalid-status',
        },
      ];

      const result = await service.validateApplicationData(
        records,
        fieldMapping,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Status must be one of');
    });

    it('should detect invalid fit score values', async () => {
      const records = [
        {
          'Candidate ID': 'candidate-123',
          'Job Variant ID': 'job-variant-123',
          'Fit Score': '150', // Over 100
        },
        {
          'Candidate ID': 'candidate-456',
          'Job Variant ID': 'job-variant-456',
          'Fit Score': '-10', // Under 0
        },
      ];

      const result = await service.validateApplicationData(
        records,
        fieldMapping,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].message).toContain(
        'Fit score must be a number between 0 and 100',
      );
      expect(result.errors[1].message).toContain(
        'Fit score must be a number between 0 and 100',
      );
    });
  });

  describe('generateValidationReport', () => {
    it('should generate a comprehensive validation report', () => {
      const validationResult = {
        isValid: false,
        errors: [
          {
            row: 1,
            field: 'email',
            message: 'Invalid email format',
            data: { email: 'invalid-email' },
          },
          {
            row: 2,
            message: 'firstName is required',
            data: { lastName: 'Doe' },
          },
        ],
        validRecords: [{ email: 'valid@example.com', firstName: 'John' }],
        invalidRecords: [{ email: 'invalid-email' }, { lastName: 'Doe' }],
      };

      const report = service.generateValidationReport(validationResult);

      expect(report).toContain('Validation Report');
      expect(report).toContain('Total Records: 3');
      expect(report).toContain('Valid Records: 1');
      expect(report).toContain('Invalid Records: 2');
      expect(report).toContain('Total Errors: 2');
      expect(report).toContain('Row 1 - Field: email - Invalid email format');
      expect(report).toContain('Row 2 - firstName is required');
    });

    it('should generate report for valid data', () => {
      const validationResult = {
        isValid: true,
        errors: [],
        validRecords: [
          { email: 'john@example.com', firstName: 'John' },
          { email: 'jane@example.com', firstName: 'Jane' },
        ],
        invalidRecords: [],
      };

      const report = service.generateValidationReport(validationResult);

      expect(report).toContain('Total Records: 2');
      expect(report).toContain('Valid Records: 2');
      expect(report).toContain('Invalid Records: 0');
      expect(report).toContain('Total Errors: 0');
      expect(report).not.toContain('Errors:');
    });
  });
});
