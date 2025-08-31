import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { User, UserRole } from '../src/entities/user.entity';
import {
  Organization,
  OrganizationType,
  SubscriptionPlan,
} from '../src/entities/organization.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let organizationRepository: Repository<Organization>;
  let jwtService: JwtService;

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
          entities: [User, Organization],
          synchronize: true,
          logging: false,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([User, Organization]),
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    organizationRepository = moduleFixture.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await userRepository.clear();
    await organizationRepository.clear();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user successfully with organization creation', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'recruiter',
        companyName: 'Test Company Inc',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // Verify response structure matches AuthResponse interface
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.expiresIn).toBe(3600);
      expect(response.body.user).toMatchObject({
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: UserRole.RECRUITER,
      });
      expect(response.body.user).toHaveProperty('organizationId');

      // Verify user was created in database
      const user = await userRepository.findOne({
        where: { email: registerDto.email },
        relations: ['organization'],
      });
      expect(user).toBeDefined();
      expect(user?.email).toBe(registerDto.email);
      expect(user?.role).toBe(UserRole.RECRUITER);
      expect(user?.organizationId).toBeDefined();

      // Verify organization was created
      const organization = await organizationRepository.findOne({
        where: { id: user?.organizationId },
      });
      expect(organization).toBeDefined();
      expect(organization?.name).toBe(registerDto.companyName);
      expect(organization?.type).toBe(OrganizationType.SMB);
      expect(organization?.subscriptionPlan).toBe(SubscriptionPlan.FREE);
      expect(organization?.isActive).toBe(true);
    });

    it('should register hiring manager role correctly', async () => {
      const registerDto = {
        email: 'manager@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Manager',
        role: 'hiring_manager',
        companyName: 'Manager Company',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body.user.role).toBe(UserRole.HIRING_MANAGER);

      // Verify in database
      const user = await userRepository.findOne({
        where: { email: registerDto.email },
      });
      expect(user?.role).toBe(UserRole.HIRING_MANAGER);
    });

    it('should return 409 when user already exists in same organization', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'recruiter',
        companyName: 'Existing Company',
      };

      // Create user first
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // Try to register same user again
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should allow same email in different organizations', async () => {
      // Create first organization and user
      const org1 = organizationRepository.create({
        name: 'Organization 1',
        type: OrganizationType.SMB,
        subscriptionPlan: SubscriptionPlan.FREE,
      });
      const savedOrg1 = await organizationRepository.save(org1);

      const registerDto1 = {
        email: 'shared@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'recruiter',
        companyName: 'Company 1',
        organizationId: savedOrg1.id,
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto1)
        .expect(201);

      // Register same email in different organization (new organization)
      const registerDto2 = {
        email: 'shared@example.com',
        password: 'password456',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'hiring_manager',
        companyName: 'Company 2',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto2)
        .expect(201);

      expect(response.body.user.email).toBe('shared@example.com');
      expect(response.body.user.firstName).toBe('Jane');

      // Verify both users exist in database
      const users = await userRepository.find({
        where: { email: 'shared@example.com' },
      });
      expect(users).toHaveLength(2);
      expect(users[0].organizationId).not.toBe(users[1].organizationId);
    });

    it('should return 400 for invalid email format', async () => {
      const invalidDto = {
        email: 'invalid-email',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'recruiter',
        companyName: 'Test Company',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('email');
    });

    it('should return 400 for password too short', async () => {
      const invalidDto = {
        email: 'test@example.com',
        password: '123', // Too short
        firstName: 'John',
        lastName: 'Doe',
        role: 'recruiter',
        companyName: 'Test Company',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('password');
    });

    it('should return 400 for missing required fields', async () => {
      const invalidDto = {
        email: 'test@example.com',
        password: 'password123',
        // Missing firstName, lastName, role, companyName
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidDto)
        .expect(400);
    });

    it('should return 400 for invalid role', async () => {
      const invalidDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'invalid_role',
        companyName: 'Test Company',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('role');
    });

    it('should hash password correctly', async () => {
      const registerDto = {
        email: 'hash@example.com',
        password: 'password123',
        firstName: 'Hash',
        lastName: 'Test',
        role: 'recruiter',
        companyName: 'Hash Company',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      const user = await userRepository.findOne({
        where: { email: registerDto.email },
      });

      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe(registerDto.password);
      expect(user?.passwordHash.length).toBeGreaterThan(50); // Bcrypt hash length
    });
  });

  describe('/auth/login (POST)', () => {
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

    it('should return 400 for invalid input', async () => {
      const invalidDto = {
        email: 'invalid-email',
        password: '',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(invalidDto)
        .expect(400);
    });

    it('should login user from correct organization when multiple exist', async () => {
      // Create second organization and user with same email
      const registerDto2 = {
        email: 'login@example.com',
        password: 'different123',
        firstName: 'Different',
        lastName: 'User',
        role: 'hiring_manager',
        companyName: 'Different Company',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto2);

      // Login should work with first user's password
      const loginDto1 = {
        email: 'login@example.com',
        password: 'password123',
      };

      const response1 = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto1)
        .expect(200);

      expect(response1.body.user.firstName).toBe('Login');
      expect(response1.body.user.role).toBe(UserRole.RECRUITER);

      // Login should also work with second user's password
      const loginDto2 = {
        email: 'login@example.com',
        password: 'different123',
      };

      const response2 = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto2)
        .expect(200);

      expect(response2.body.user.firstName).toBe('Different');
      expect(response2.body.user.role).toBe(UserRole.HIRING_MANAGER);
    });
  });

  describe('/auth/refresh (POST)', () => {
    let refreshToken: string;
    let userId: string;

    beforeEach(async () => {
      // Register and login to get refresh token
      const registerDto = {
        email: 'refresh@example.com',
        password: 'password123',
        firstName: 'Refresh',
        lastName: 'User',
        role: 'recruiter',
        companyName: 'Refresh Company',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto);

      refreshToken = registerResponse.body.refreshToken;
      userId = registerResponse.body.user.id;
    });

    it('should refresh access token successfully', async () => {
      const refreshDto = {
        refresh_token: refreshToken,
      };

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshDto)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.expiresIn).toBe(3600);
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');

      // Verify new tokens are different from original
      expect(response.body.refreshToken).not.toBe(refreshToken);
    });

    it('should return 401 for invalid refresh token', async () => {
      const refreshDto = {
        refresh_token: 'invalid-token',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshDto)
        .expect(401);

      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should return 400 for missing refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });

    it('should return 401 for refresh token of inactive user', async () => {
      // Deactivate user
      await userRepository.update(userId, { isActive: false });

      const refreshDto = {
        refresh_token: refreshToken,
      };

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshDto)
        .expect(401);

      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should return 401 for expired refresh token', async () => {
      // Create an expired token
      const expiredPayload = {
        sub: userId,
        email: 'refresh@example.com',
        role: UserRole.RECRUITER,
        organizationId: 'some-org-id',
      };
      const expiredToken = jwtService.sign(expiredPayload, { expiresIn: '0s' });

      // Wait a moment to ensure expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      const refreshDto = {
        refresh_token: expiredToken,
      };

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshDto)
        .expect(401);

      expect(response.body.message).toBe('Invalid refresh token');
    });
  });

  describe('/auth/verify (GET)', () => {
    let accessToken: string;
    let userId: string;
    let organizationId: string;

    beforeEach(async () => {
      // Register and login to get access token
      const registerDto = {
        email: 'verify@example.com',
        password: 'password123',
        firstName: 'Verify',
        lastName: 'User',
        role: 'recruiter',
        companyName: 'Verify Company',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto);

      accessToken = registerResponse.body.accessToken;
      userId = registerResponse.body.user.id;
      organizationId = registerResponse.body.user.organizationId;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.user).toMatchObject({
        id: userId,
        email: 'verify@example.com',
        firstName: 'Verify',
        lastName: 'User',
        role: UserRole.RECRUITER,
        organizationId: organizationId,
      });
    });

    it('should return 401 without authorization header', async () => {
      await request(app.getHttpServer()).get('/auth/verify').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 with malformed authorization header', async () => {
      await request(app.getHttpServer())
        .get('/auth/verify')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });

    it('should return 401 for inactive user', async () => {
      // Deactivate user
      await userRepository.update(userId, { isActive: false });

      await request(app.getHttpServer())
        .get('/auth/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });

  describe('Organization Creation Integration', () => {
    it('should create organization during registration', async () => {
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

    it('should handle organization creation failure gracefully', async () => {
      // Mock organization repository to simulate failure
      const originalSave = organizationRepository.save;
      organizationRepository.save = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const registerDto = {
        email: 'fail@example.com',
        password: 'password123',
        firstName: 'Fail',
        lastName: 'Test',
        role: 'recruiter',
        companyName: 'Failing Company',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(500);

      // Verify no user was created
      const user = await userRepository.findOne({
        where: { email: registerDto.email },
      });
      expect(user).toBeNull();

      // Restore original method
      organizationRepository.save = originalSave;
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

  describe('Token Generation and Validation', () => {
    it('should generate valid JWT tokens with correct payload', async () => {
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

      const { accessToken, refreshToken } = response.body;

      // Verify access token
      const accessPayload = jwtService.verify(accessToken);
      expect(accessPayload.sub).toBe(response.body.user.id);
      expect(accessPayload.email).toBe(registerDto.email);
      expect(accessPayload.role).toBe(UserRole.RECRUITER);
      expect(accessPayload.organizationId).toBe(
        response.body.user.organizationId,
      );

      // Verify refresh token
      const refreshPayload = jwtService.verify(refreshToken);
      expect(refreshPayload.sub).toBe(response.body.user.id);
      expect(refreshPayload.email).toBe(registerDto.email);
      expect(refreshPayload.role).toBe(UserRole.RECRUITER);
      expect(refreshPayload.organizationId).toBe(
        response.body.user.organizationId,
      );
    });

    it('should validate tokens correctly in protected endpoints', async () => {
      const registerDto = {
        email: 'protected@example.com',
        password: 'password123',
        firstName: 'Protected',
        lastName: 'Test',
        role: 'hiring_manager',
        companyName: 'Protected Company',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      const { accessToken } = registerResponse.body;

      // Use token to access protected endpoint
      const verifyResponse = await request(app.getHttpServer())
        .get('/auth/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(verifyResponse.body.user.email).toBe(registerDto.email);
      expect(verifyResponse.body.user.role).toBe(UserRole.HIRING_MANAGER);
    });

    it('should reject expired tokens', async () => {
      const registerDto = {
        email: 'expired@example.com',
        password: 'password123',
        firstName: 'Expired',
        lastName: 'Test',
        role: 'recruiter',
        companyName: 'Expired Company',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // Create an expired token
      const expiredPayload = {
        sub: registerResponse.body.user.id,
        email: registerDto.email,
        role: UserRole.RECRUITER,
        organizationId: registerResponse.body.user.organizationId,
      };
      const expiredToken = jwtService.sign(expiredPayload, { expiresIn: '0s' });

      // Wait to ensure expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try to use expired token
      await request(app.getHttpServer())
        .get('/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('End-to-End Registration Flow', () => {
    it('should complete full registration flow successfully', async () => {
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
      expect(registerResponse.body.user.email).toBe(registerDto.email);

      // Step 2: Verify user can login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerDto.email,
          password: registerDto.password,
        })
        .expect(200);

      expect(loginResponse.body.user.email).toBe(registerDto.email);

      // Step 3: Verify user can access protected endpoints
      const verifyResponse = await request(app.getHttpServer())
        .get('/auth/verify')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .expect(200);

      expect(verifyResponse.body.user.email).toBe(registerDto.email);

      // Step 4: Verify token refresh works
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: loginResponse.body.refreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');

      // Step 5: Verify new token works
      await request(app.getHttpServer())
        .get('/auth/verify')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .expect(200);
    });

    it('should handle registration with duplicate email correctly', async () => {
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

    it('should handle invalid registration data correctly', async () => {
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
        },
      ];

      for (const testCase of invalidCases) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(testCase.data)
          .expect(400);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('statusCode', 400);
      }

      // Verify no users were created
      const users = await userRepository.find();
      expect(users).toHaveLength(0);
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

    it('should maintain data integrity across authentication operations', async () => {
      const registerDto = {
        email: 'integrity@example.com',
        password: 'password123',
        firstName: 'Integrity',
        lastName: 'Test',
        role: 'hiring_manager',
        companyName: 'Integrity Company',
      };

      // Register
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      const userId = registerResponse.body.user.id;
      const organizationId = registerResponse.body.user.organizationId;

      // Login
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerDto.email,
          password: registerDto.password,
        })
        .expect(200);

      // Refresh token
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: registerResponse.body.refreshToken })
        .expect(200);

      // Verify data integrity after all operations
      const user = await userRepository.findOne({
        where: { id: userId },
        relations: ['organization'],
      });

      expect(user).toBeDefined();
      expect(user?.id).toBe(userId);
      expect(user?.organizationId).toBe(organizationId);
      expect(user?.organization.id).toBe(organizationId);
      expect(user?.isActive).toBe(true);

      const organization = await organizationRepository.findOne({
        where: { id: organizationId },
        relations: ['users'],
      });

      expect(organization).toBeDefined();
      expect(organization?.users).toHaveLength(1);
      expect(organization?.users[0].id).toBe(userId);
    });
  });
});
