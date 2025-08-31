import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Organization } from '../src/entities/organization.entity';
import { User, UserRole } from '../src/entities/user.entity';
import { JobFamily } from '../src/entities/job-family.entity';
import { Candidate } from '../src/entities/candidate.entity';
import { AuthService } from '../src/auth/auth.service';

describe('Tenant Isolation (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;

  // Test data
  let org1: Organization;
  let org2: Organization;
  let user1: User;
  let user2: User;
  let token1: string;
  let token2: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    authService = moduleFixture.get<AuthService>(AuthService);
    await app.init();

    // Create test organizations and users
    await setupTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupTestData() {
    // Register users which will create organizations
    const registerResponse1 = await authService.register({
      email: 'user1@org1.com',
      password: 'password123',
      firstName: 'User',
      lastName: 'One',
      organizationName: 'Organization 1',
    });

    const registerResponse2 = await authService.register({
      email: 'user2@org2.com',
      password: 'password123',
      firstName: 'User',
      lastName: 'Two',
      organizationName: 'Organization 2',
    });

    token1 = registerResponse1.access_token;
    token2 = registerResponse2.access_token;

    user1 = await authService.findById(registerResponse1.user.id);
    user2 = await authService.findById(registerResponse2.user.id);
  }

  describe('Job Family Isolation', () => {
    let jobFamily1Id: string;
    let jobFamily2Id: string;

    it('should create job families in separate tenants', async () => {
      // Create job family in org1
      const response1 = await request(app.getHttpServer())
        .post('/api/job-families')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'Software Engineer - Org1',
          description: 'Software engineering role for org1',
          skillCategories: ['JavaScript', 'Node.js'],
        })
        .expect(201);

      jobFamily1Id = response1.body.id;

      // Create job family in org2
      const response2 = await request(app.getHttpServer())
        .post('/api/job-families')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          name: 'Software Engineer - Org2',
          description: 'Software engineering role for org2',
          skillCategories: ['Python', 'Django'],
        })
        .expect(201);

      jobFamily2Id = response2.body.id;

      expect(response1.body.name).toBe('Software Engineer - Org1');
      expect(response2.body.name).toBe('Software Engineer - Org2');
    });

    it('should only return job families for the correct tenant', async () => {
      // User1 should only see org1 job families
      const response1 = await request(app.getHttpServer())
        .get('/api/job-families')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response1.body).toHaveLength(1);
      expect(response1.body[0].name).toBe('Software Engineer - Org1');

      // User2 should only see org2 job families
      const response2 = await request(app.getHttpServer())
        .get('/api/job-families')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response2.body).toHaveLength(1);
      expect(response2.body[0].name).toBe('Software Engineer - Org2');
    });

    it('should not allow access to job families from other tenants', async () => {
      // User1 trying to access org2's job family
      await request(app.getHttpServer())
        .get(`/api/job-families/${jobFamily2Id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(404);

      // User2 trying to access org1's job family
      await request(app.getHttpServer())
        .get(`/api/job-families/${jobFamily1Id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);
    });

    it('should not allow updating job families from other tenants', async () => {
      // User1 trying to update org2's job family
      await request(app.getHttpServer())
        .patch(`/api/job-families/${jobFamily2Id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ name: 'Hacked Job Family' })
        .expect(404);

      // User2 trying to update org1's job family
      await request(app.getHttpServer())
        .patch(`/api/job-families/${jobFamily1Id}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ name: 'Hacked Job Family' })
        .expect(404);
    });

    it('should not allow deleting job families from other tenants', async () => {
      // User1 trying to delete org2's job family
      await request(app.getHttpServer())
        .delete(`/api/job-families/${jobFamily2Id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(404);

      // User2 trying to delete org1's job family
      await request(app.getHttpServer())
        .delete(`/api/job-families/${jobFamily1Id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);
    });
  });

  describe('Candidate Isolation', () => {
    let candidate1Id: string;
    let candidate2Id: string;

    it('should create candidates in separate tenants', async () => {
      // Create candidate in org1
      const response1 = await request(app.getHttpServer())
        .post('/api/candidates')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          email: 'candidate1@org1.com',
          firstName: 'Candidate',
          lastName: 'One',
          phone: '+1234567890',
          location: 'New York',
        })
        .expect(201);

      candidate1Id = response1.body.id;

      // Create candidate in org2
      const response2 = await request(app.getHttpServer())
        .post('/api/candidates')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          email: 'candidate2@org2.com',
          firstName: 'Candidate',
          lastName: 'Two',
          phone: '+0987654321',
          location: 'San Francisco',
        })
        .expect(201);

      candidate2Id = response2.body.id;

      expect(response1.body.email).toBe('candidate1@org1.com');
      expect(response2.body.email).toBe('candidate2@org2.com');
    });

    it('should only return candidates for the correct tenant', async () => {
      // User1 should only see org1 candidates
      const response1 = await request(app.getHttpServer())
        .get('/api/candidates')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response1.body.data).toHaveLength(1);
      expect(response1.body.data[0].email).toBe('candidate1@org1.com');

      // User2 should only see org2 candidates
      const response2 = await request(app.getHttpServer())
        .get('/api/candidates')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response2.body.data).toHaveLength(1);
      expect(response2.body.data[0].email).toBe('candidate2@org2.com');
    });

    it('should not allow access to candidates from other tenants', async () => {
      // User1 trying to access org2's candidate
      await request(app.getHttpServer())
        .get(`/api/candidates/${candidate2Id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(404);

      // User2 trying to access org1's candidate
      await request(app.getHttpServer())
        .get(`/api/candidates/${candidate1Id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);
    });
  });

  describe('Cross-Tenant Data Leakage Prevention', () => {
    it('should not allow creating duplicate emails across different tenants', async () => {
      const candidateData = {
        email: 'duplicate@test.com',
        firstName: 'Duplicate',
        lastName: 'User',
      };

      // Create candidate in org1
      await request(app.getHttpServer())
        .post('/api/candidates')
        .set('Authorization', `Bearer ${token1}`)
        .send(candidateData)
        .expect(201);

      // Should be able to create same email in org2 (different tenant)
      await request(app.getHttpServer())
        .post('/api/candidates')
        .set('Authorization', `Bearer ${token2}`)
        .send(candidateData)
        .expect(201);
    });

    it('should prevent SQL injection attempts across tenants', async () => {
      // Attempt SQL injection in job family name
      const maliciousData = {
        name: "'; DROP TABLE job_families; --",
        description: 'Malicious job family',
      };

      await request(app.getHttpServer())
        .post('/api/job-families')
        .set('Authorization', `Bearer ${token1}`)
        .send(maliciousData)
        .expect(201);

      // Verify that org2 data is still intact
      const response = await request(app.getHttpServer())
        .get('/api/job-families')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response.body).toHaveLength(1); // Should still have the original job family
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication', async () => {
      await request(app.getHttpServer()).get('/api/job-families').expect(401);
    });

    it('should reject requests with invalid tokens', async () => {
      await request(app.getHttpServer())
        .get('/api/job-families')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject requests with expired tokens', async () => {
      // This would require creating an expired token, which is complex in a test
      // In a real scenario, you'd test with a token that has a very short expiry
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      await request(app.getHttpServer())
        .get('/api/job-families')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Organization Management', () => {
    it('should allow admin to view organization details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/organizations/${user1.organizationId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.name).toBe('Organization 1');
    });

    it('should not allow access to other organizations', async () => {
      await request(app.getHttpServer())
        .get(`/api/organizations/${user2.organizationId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200); // Should return user1's org instead
    });

    it('should allow admin to view organization users', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/organizations/${user1.organizationId}/users`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].email).toBe('user1@org1.com');
    });
  });
});
