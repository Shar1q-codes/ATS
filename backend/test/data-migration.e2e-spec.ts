import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  ImportJob,
  ImportType,
  ImportStatus,
} from '../src/entities/import-job.entity';
import {
  ExportJob,
  ExportType,
  ExportFormat,
  ExportStatus,
} from '../src/entities/export-job.entity';
import { FieldMapping } from '../src/entities/field-mapping.entity';
import { Organization } from '../src/entities/organization.entity';
import { User } from '../src/entities/user.entity';
import { Candidate } from '../src/entities/candidate.entity';
import { JwtService } from '@nestjs/jwt';

describe('Data Migration (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let organization: Organization;
  let user: User;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();

    // Create test organization and user
    const orgRepository = app.get('OrganizationRepository');
    const userRepository = app.get('UserRepository');

    organization = await orgRepository.save({
      name: 'Test Organization',
      type: 'smb',
      subscriptionPlan: 'professional',
    });

    user = await userRepository.save({
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      organizationId: organization.id,
      hashedPassword: 'hashed-password',
    });

    authToken = jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: organization.id,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/import (POST)', () => {
    it('should create field mapping', async () => {
      const fieldMappingDto = {
        name: 'Default Candidate Mapping',
        type: ImportType.CANDIDATES,
        mapping: {
          Email: 'email',
          'First Name': 'firstName',
          'Last Name': 'lastName',
          Phone: 'phone',
        },
        transformations: {
          phone: {
            type: 'string',
            required: false,
          },
        },
        isDefault: true,
      };

      const response = await request(app.getHttpServer())
        .post('/import/field-mappings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(fieldMappingDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(fieldMappingDto.name);
      expect(response.body.data.type).toBe(fieldMappingDto.type);
      expect(response.body.data.mapping).toEqual(fieldMappingDto.mapping);
    });

    it('should get field mappings', async () => {
      const response = await request(app.getHttpServer())
        .get('/import/field-mappings')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: ImportType.CANDIDATES })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get default field mapping for candidates', async () => {
      const response = await request(app.getHttpServer())
        .get(`/import/field-mappings/defaults/${ImportType.CANDIDATES}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('Email');
      expect(response.body.data).toHaveProperty('First Name');
      expect(response.body.data).toHaveProperty('Last Name');
    });

    it('should bulk import candidates', async () => {
      const bulkImportDto = {
        candidates: [
          {
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            phone: '+1234567890',
            location: 'New York, NY',
            skills: ['JavaScript', 'React', 'Node.js'],
            experience: 5,
          },
          {
            email: 'jane.smith@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
            phone: '+1234567891',
            location: 'San Francisco, CA',
            skills: ['Python', 'Django', 'PostgreSQL'],
            experience: 3,
          },
        ],
        source: 'bulk_import_test',
      };

      const response = await request(app.getHttpServer())
        .post('/import/candidates/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkImportDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.successful).toBe(2);
      expect(response.body.data.failed).toBe(0);
      expect(response.body.data.errors).toHaveLength(0);
    });

    it('should handle duplicate candidates in bulk import', async () => {
      const bulkImportDto = {
        candidates: [
          {
            email: 'john.doe@example.com', // Duplicate from previous test
            firstName: 'John',
            lastName: 'Doe',
          },
          {
            email: 'new.candidate@example.com',
            firstName: 'New',
            lastName: 'Candidate',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/import/candidates/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkImportDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.successful).toBe(1);
      expect(response.body.data.failed).toBe(1);
      expect(response.body.data.errors).toHaveLength(1);
      expect(response.body.data.errors[0].message).toContain('already exists');
    });
  });

  describe('/export (POST)', () => {
    it('should create export job', async () => {
      const createExportDto = {
        name: 'Test Candidates Export',
        type: ExportType.CANDIDATES,
        format: ExportFormat.CSV,
        filters: {
          dateFrom: '2024-01-01',
          dateTo: '2024-12-31',
        },
        selectedFields: ['email', 'firstName', 'lastName', 'phone', 'location'],
      };

      const response = await request(app.getHttpServer())
        .post('/export/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createExportDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(createExportDto.name);
      expect(response.body.data.type).toBe(createExportDto.type);
      expect(response.body.data.format).toBe(createExportDto.format);
      expect(response.body.data.status).toBe(ExportStatus.PENDING);
    });

    it('should get export jobs', async () => {
      const response = await request(app.getHttpServer())
        .get('/export/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should export candidates immediately as CSV', async () => {
      const exportRequest = {
        format: ExportFormat.CSV,
        filters: {
          dateFrom: '2024-01-01',
        },
        selectedFields: ['email', 'firstName', 'lastName'],
      };

      const response = await request(app.getHttpServer())
        .post('/export/candidates/immediate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(exportRequest)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');

      const csvContent = response.text;
      expect(csvContent).toContain('email,firstName,lastName');
      expect(csvContent).toContain('john.doe@example.com');
      expect(csvContent).toContain('jane.smith@example.com');
    });

    it('should export candidates immediately as JSON', async () => {
      const exportRequest = {
        format: ExportFormat.JSON,
        selectedFields: ['email', 'firstName', 'lastName'],
      };

      const response = await request(app.getHttpServer())
        .post('/export/candidates/immediate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(exportRequest)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');

      const jsonContent = JSON.parse(response.text);
      expect(Array.isArray(jsonContent)).toBe(true);
      expect(jsonContent.length).toBeGreaterThan(0);
      expect(jsonContent[0]).toHaveProperty('email');
      expect(jsonContent[0]).toHaveProperty('firstName');
      expect(jsonContent[0]).toHaveProperty('lastName');
    });

    it('should export full backup', async () => {
      const response = await request(app.getHttpServer())
        .post('/export/backup/full')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('full-backup');

      const backupContent = JSON.parse(response.text);
      expect(backupContent).toHaveProperty('candidates');
      expect(backupContent).toHaveProperty('jobs');
      expect(backupContent).toHaveProperty('applications');
      expect(backupContent).toHaveProperty('companies');
      expect(Array.isArray(backupContent.candidates)).toBe(true);
    });

    it('should get export template for candidates', async () => {
      const response = await request(app.getHttpServer())
        .get(`/export/templates/${ExportType.CANDIDATES}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: ExportFormat.CSV })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain(
        'candidate-import-template',
      );

      const csvContent = response.text;
      expect(csvContent).toContain('email,firstName,lastName');
      expect(csvContent).toContain('john.doe@example.com');
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/import/jobs').expect(401);
    });

    it('should return 403 for insufficient permissions', async () => {
      // Create a user with limited permissions
      const userRepository = app.get('UserRepository');
      const limitedUser = await userRepository.save({
        email: 'limited@test.com',
        firstName: 'Limited',
        lastName: 'User',
        role: 'hiring_manager', // Not admin or recruiter
        organizationId: organization.id,
        hashedPassword: 'hashed-password',
      });

      const limitedToken = jwtService.sign({
        sub: limitedUser.id,
        email: limitedUser.email,
        role: limitedUser.role,
        organizationId: organization.id,
      });

      await request(app.getHttpServer())
        .post('/import/candidates/bulk')
        .set('Authorization', `Bearer ${limitedToken}`)
        .send({ candidates: [] })
        .expect(403);
    });

    it('should handle invalid export format', async () => {
      const exportRequest = {
        format: 'invalid-format',
        selectedFields: ['email'],
      };

      await request(app.getHttpServer())
        .post('/export/candidates/immediate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(exportRequest)
        .expect(400);
    });

    it('should handle invalid import type', async () => {
      const fieldMappingDto = {
        name: 'Invalid Mapping',
        type: 'invalid-type',
        mapping: {},
      };

      await request(app.getHttpServer())
        .post('/import/field-mappings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(fieldMappingDto)
        .expect(400);
    });
  });

  describe('Data Validation', () => {
    it('should validate bulk import data', async () => {
      const bulkImportDto = {
        candidates: [
          {
            email: 'invalid-email', // Invalid email format
            firstName: 'John',
            lastName: 'Doe',
          },
          {
            // Missing required fields
            phone: '+1234567890',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/import/candidates/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkImportDto)
        .expect(201);

      expect(response.body.data.successful).toBe(0);
      expect(response.body.data.failed).toBe(2);
      expect(response.body.data.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Tenant Isolation', () => {
    it("should only return data for the user's organization", async () => {
      // Create another organization and user
      const orgRepository = app.get('OrganizationRepository');
      const userRepository = app.get('UserRepository');

      const otherOrg = await orgRepository.save({
        name: 'Other Organization',
        type: 'smb',
        subscriptionPlan: 'basic',
      });

      const otherUser = await userRepository.save({
        email: 'other@test.com',
        firstName: 'Other',
        lastName: 'User',
        role: 'admin',
        organizationId: otherOrg.id,
        hashedPassword: 'hashed-password',
      });

      const otherToken = jwtService.sign({
        sub: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
        organizationId: otherOrg.id,
      });

      // Export candidates from other organization should return empty
      const response = await request(app.getHttpServer())
        .post('/export/candidates/immediate')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          format: ExportFormat.JSON,
        })
        .expect(200);

      const jsonContent = JSON.parse(response.text);
      expect(Array.isArray(jsonContent)).toBe(true);
      expect(jsonContent.length).toBe(0); // No candidates in other org
    });
  });
});
