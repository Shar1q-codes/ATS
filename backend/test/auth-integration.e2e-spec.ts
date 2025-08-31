import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

// Import services and entities
import { AuthService } from '../src/auth/auth.service';
import { AuthController } from '../src/auth/auth.controller';
import { User, UserRole } from '../src/entities/user.entity';
import {
  TestOrganization,
  OrganizationType,
  SubscriptionPlan,
} from './entities/test-organization.entity';

describe('Authentication Integration Tests (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let organizationRepository: Repository<TestOrganization>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User, TestOrganization],
          synchronize: true,
          logging: false,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([User, TestOrganization]),
        PassportModule,
        JwtModule.register({
          secret: 'test-jwt-secret-key-for-testing-only',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController],
      providers: [AuthService],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    organizationRepository = moduleFixture.get<Repository<TestOrganization>>(
      getRepositoryToken(TestOrganization),
    );

    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    // Clean up database before each test
    await userRepository.clear();
    await organizationRepository.clear();
  });

  describe('End-to-End Registration Flow', () => {
    it('should complete full registration flow with organization creation', async () => {
      const registerDto = {
        email: 'e2e@example.com',
        password: 'password123',
        firstName: 'End',
        lastName: 'ToEnd',
        role: 'recruiter',
        companyName: 'E2E Testing Company',
      };

      // Step 1: Register user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('accessToken');
      expect(registerResponse.body).toHaveProperty('refreshToken');
      expect(registerResponse.body).toHaveProperty('expiresIn');
      expect(registerResponse.body.user.email).toBe(registerDto.email);
      expect(registerResponse.body.user.role).toBe(UserRole.RECRUITER);
      expect(registerResponse.body.user).toHaveProperty('organizationId');

      // Verify organization was created
      const organization = await organizationRepository.findOne({
        where: { id: registerResponse.body.user.organizationId },
      });
      expect(organization).toBeDefined();
      expect(organization?.name).toBe(registerDto.companyName);
      expect(organization?.type).toBe(OrganizationType.SMB);
      expect(organization?.subscriptionPlan).toBe(SubscriptionPlan.FREE);

      // Step 2: Verify user can login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerDto.email,
          password: registerDto.password,
        })
        .expect(200);

      expect(loginResponse.body.user.email).toBe(registerDto.email);
      expect(loginResponse.body.user.organizationId).toBe(
        registerResponse.body.user.organizationId,
      );

      // Step 3: Verify token refresh works
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: loginResponse.body.refreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');
    });

    it('should handle duplicate email registration correctly', async () => {
      const registerDto = {
        email: 'duplicate@example.com',
        password: 'password123',
        firstName: 'First',
        lastName: 'User',
        role: 'recruiter',
        companyName: 'First Company',
      };

      // First registration should succeed
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // Second registration with same email should fail
      const duplicateResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...registerDto,
          firstName: 'Second',
          companyName: 'Second Company',
        })
        .expect(409);

      expect(duplicateResponse.body.message).toContain('already exists');

      // Verify only one user exists
      const users = await userRepository.find({
        where: { email: registerDto.email },
      });
      expect(users).toHaveLength(1);
      expect(users[0].firstName).toBe('First');
    });

    it('should validate registration data correctly', async () => {
      const invalidCases = [
        {
          name: 'invalid email',
          data: {
            email: 'invalid-email',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
            role: 'recruiter',
            companyName: 'Test Company',
          },
          expectedStatus: 400,
        },
        {
          name: 'short password',
          data: {
            email: 'test@example.com',
            password: '123',
            firstName: 'Test',
            lastName: 'User',
            role: 'recruiter',
            companyName: 'Test Company',
          },
          expectedStatus: 400,
        },
        {
          name: 'missing firstName',
          data: {
            email: 'test@example.com',
            password: 'password123',
            lastName: 'User',
            role: 'recruiter',
            companyName: 'Test Company',
          },
          expectedStatus: 400,
        },
        {
          name: 'invalid role',
          data: {
            email: 'test@example.com',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
            role: 'invalid_role',
            companyName: 'Test Company',
          },
          expectedStatus: 400,
        },
        {
          name: 'missing companyName',
          data: {
            email: 'test@example.com',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
            role: 'recruiter',
          },
          expectedStatus: 400,
        },
      ];

      for (const testCase of invalidCases) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(testCase.data)
          .expect(testCase.expectedStatus);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty(
          'statusCode',
          testCase.expectedStatus,
        );
      }

      // Verify no users were created
      const users = await userRepository.find();
      expect(users).toHaveLength(0);
    });
  });

  describe('Token Generation and Validation', () => {
    it('should generate and validate JWT tokens correctly', async () => {
      const registerDto = {
        email: 'token@example.com',
        password: 'password123',
        firstName: 'Token',
        lastName: 'Test',
        role: 'recruiter',
        companyName: 'Token Company',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      const { accessToken } = response.body;

      // Use token to access protected endpoint (if available)
      // For now, we'll just verify the token structure
      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe('string');
      expect(accessToken.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should handle token refresh correctly', async () => {
      const registerDto = {
        email: 'refresh@example.com',
        password: 'password123',
        firstName: 'Refresh',
        lastName: 'Test',
        role: 'hiring_manager',
        companyName: 'Refresh Company',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      const { refreshToken } = registerResponse.body;

      // Test token refresh
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');
      expect(refreshResponse.body).toHaveProperty('expiresIn');
      expect(refreshResponse.body.expiresIn).toBe(3600);

      // Verify new tokens are different from original
      expect(refreshResponse.body.refreshToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh tokens', async () => {
      const invalidTokenResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: 'invalid-token' })
        .expect(401);

      expect(invalidTokenResponse.body.message).toBe('Invalid refresh token');

      const missingTokenResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);

      expect(missingTokenResponse.body).toHaveProperty('message');
    });
  });

  describe('Organization Creation Integration', () => {
    it('should create organization with correct properties', async () => {
      const registerDto = {
        email: 'org@example.com',
        password: 'password123',
        firstName: 'Org',
        lastName: 'Creator',
        role: 'recruiter',
        companyName: 'New Organization Inc',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      const organizationId = response.body.user.organizationId;
      expect(organizationId).toBeDefined();

      // Verify organization was created with correct properties
      const organization = await organizationRepository.findOne({
        where: { id: organizationId },
        relations: ['users'],
      });

      expect(organization).toBeDefined();
      expect(organization?.name).toBe(registerDto.companyName);
      expect(organization?.type).toBe(OrganizationType.SMB);
      expect(organization?.subscriptionPlan).toBe(SubscriptionPlan.FREE);
      expect(organization?.isActive).toBe(true);
      expect(organization?.users).toHaveLength(1);
      expect(organization?.users[0].email).toBe(registerDto.email);
    });

    it('should assign user to existing organization when organizationId provided', async () => {
      // Create organization first
      const organization = organizationRepository.create({
        name: 'Existing Organization',
        type: OrganizationType.ENTERPRISE,
        subscriptionPlan: SubscriptionPlan.PROFESSIONAL,
      });
      const savedOrg = await organizationRepository.save(organization);

      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Existing',
        lastName: 'User',
        role: 'hiring_manager',
        companyName: 'This Should Be Ignored',
        organizationId: savedOrg.id,
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body.user.organizationId).toBe(savedOrg.id);

      // Verify user was assigned to existing organization
      const user = await userRepository.findOne({
        where: { email: registerDto.email },
        relations: ['organization'],
      });

      expect(user?.organizationId).toBe(savedOrg.id);
      expect(user?.organization.name).toBe('Existing Organization');
      expect(user?.organization.type).toBe(OrganizationType.ENTERPRISE);
    });
  });

  describe('Database Persistence and Relationships', () => {
    it('should persist user data correctly with organization relationship', async () => {
      const registerDto = {
        email: 'persist@example.com',
        password: 'password123',
        firstName: 'Persist',
        lastName: 'User',
        role: 'recruiter',
        companyName: 'Persistence Company',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // Verify user exists in database with correct data
      const user = await userRepository.findOne({
        where: { email: registerDto.email },
        relations: ['organization'],
      });

      expect(user).toBeDefined();
      expect(user?.email).toBe(registerDto.email);
      expect(user?.firstName).toBe(registerDto.firstName);
      expect(user?.lastName).toBe(registerDto.lastName);
      expect(user?.role).toBe(UserRole.RECRUITER);
      expect(user?.isActive).toBe(true);
      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe(registerDto.password); // Should be hashed
      expect(user?.createdAt).toBeDefined();
      expect(user?.updatedAt).toBeDefined();
      expect(user?.organizationId).toBeDefined();
      expect(user?.organization).toBeDefined();
      expect(user?.organization.name).toBe(registerDto.companyName);
    });

    it('should handle concurrent registrations correctly', async () => {
      const registerDto1 = {
        email: 'concurrent1@example.com',
        password: 'password123',
        firstName: 'User1',
        lastName: 'Concurrent',
        role: 'recruiter',
        companyName: 'Concurrent Company 1',
      };

      const registerDto2 = {
        email: 'concurrent2@example.com',
        password: 'password123',
        firstName: 'User2',
        lastName: 'Concurrent',
        role: 'hiring_manager',
        companyName: 'Concurrent Company 2',
      };

      // Register both users concurrently
      const [response1, response2] = await Promise.all([
        request(app.getHttpServer()).post('/auth/register').send(registerDto1),
        request(app.getHttpServer()).post('/auth/register').send(registerDto2),
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      // Verify both users exist in database
      const users = await userRepository.find({ relations: ['organization'] });
      expect(users).toHaveLength(2);

      const emails = users.map((u) => u.email);
      expect(emails).toContain(registerDto1.email);
      expect(emails).toContain(registerDto2.email);

      // Verify both organizations were created
      const organizations = await organizationRepository.find();
      expect(organizations).toHaveLength(2);

      const orgNames = organizations.map((o) => o.name);
      expect(orgNames).toContain(registerDto1.companyName);
      expect(orgNames).toContain(registerDto2.companyName);
    });
  });

  describe('Login Integration', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const registerDto = {
        email: 'login@example.com',
        password: 'password123',
        firstName: 'Login',
        lastName: 'User',
        role: 'recruiter',
        companyName: 'Login Company',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto);
    });

    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        email: 'login@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.user).toMatchObject({
        email: loginDto.email,
        firstName: 'Login',
        lastName: 'User',
        role: UserRole.RECRUITER,
      });
      expect(response.body.user).toHaveProperty('organizationId');
    });

    it('should return 401 for invalid credentials', async () => {
      const loginDto = {
        email: 'login@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });
  });
});
