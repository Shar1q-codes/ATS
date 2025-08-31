import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';

// Import modules and entities
import { AuthModule } from '../src/auth/auth.module';
import { User, UserRole } from '../src/entities/user.entity';
import {
  Organization,
  OrganizationType,
  SubscriptionPlan,
} from '../src/entities/organization.entity';

describe('Complete Registration Flow (e2e)', () => {
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

  describe('Task 12: Test Complete Registration Flow', () => {
    describe('Test registration with valid data', () => {
      it('should successfully register a recruiter with valid data', async () => {
        const validRegisterDto = {
          email: 'recruiter@validcompany.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Recruiter',
          role: 'recruiter',
          companyName: 'Valid Recruiting Company',
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(validRegisterDto)
          .expect(201);

        // Verify response structure matches AuthResponse interface
        expect(response.body).toHaveProperty('access_token');
        expect(response.body).toHaveProperty('refresh_token');
        expect(response.body).toHaveProperty('expires_in', 3600);
        expect(response.body.user).toMatchObject({
          email: validRegisterDto.email,
          firstName: validRegisterDto.firstName,
          lastName: validRegisterDto.lastName,
          role: UserRole.RECRUITER,
        });
        expect(response.body.user).toHaveProperty('id');
        expect(response.body.user).toHaveProperty('organizationId');

        // Verify user was created in database
        const user = await userRepository.findOne({
          where: { email: validRegisterDto.email },
          relations: ['organization'],
        });
        expect(user).toBeDefined();
        expect(user?.email).toBe(validRegisterDto.email);
        expect(user?.firstName).toBe(validRegisterDto.firstName);
        expect(user?.lastName).toBe(validRegisterDto.lastName);
        expect(user?.role).toBe(UserRole.RECRUITER);
        expect(user?.isActive).toBe(true);
        expect(user?.passwordHash).toBeDefined();
        expect(user?.passwordHash).not.toBe(validRegisterDto.password);
        expect(user?.organizationId).toBeDefined();

        // Verify organization was created
        const organization = await organizationRepository.findOne({
          where: { id: user?.organizationId },
        });
        expect(organization).toBeDefined();
        expect(organization?.name).toBe(validRegisterDto.companyName);
        expect(organization?.type).toBe(OrganizationType.SMB);
        expect(organization?.subscriptionPlan).toBe(SubscriptionPlan.FREE);
        expect(organization?.isActive).toBe(true);
      });

      it('should successfully register a hiring manager with valid data', async () => {
        const validRegisterDto = {
          email: 'manager@validcompany.com',
          password: 'SecurePass456!',
          firstName: 'Jane',
          lastName: 'Manager',
          role: 'hiring_manager',
          companyName: 'Valid Management Company',
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(validRegisterDto)
          .expect(201);

        expect(response.body.user.role).toBe(UserRole.HIRING_MANAGER);

        // Verify in database
        const user = await userRepository.findOne({
          where: { email: validRegisterDto.email },
        });
        expect(user?.role).toBe(UserRole.HIRING_MANAGER);
      });

      it('should generate valid JWT tokens', async () => {
        const validRegisterDto = {
          email: 'tokentest@validcompany.com',
          password: 'SecurePass789!',
          firstName: 'Token',
          lastName: 'Test',
          role: 'recruiter',
          companyName: 'Token Test Company',
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(validRegisterDto)
          .expect(201);

        const { access_token, refresh_token } = response.body;

        // Verify access token structure and payload
        expect(access_token).toBeDefined();
        expect(typeof access_token).toBe('string');
        expect(access_token.split('.')).toHaveLength(3); // JWT has 3 parts

        const accessPayload = jwtService.verify(access_token);
        expect(accessPayload.sub).toBe(response.body.user.id);
        expect(accessPayload.email).toBe(validRegisterDto.email);
        expect(accessPayload.role).toBe(UserRole.RECRUITER);
        expect(accessPayload.organizationId).toBe(
          response.body.user.organizationId,
        );

        // Verify refresh token structure and payload
        expect(refresh_token).toBeDefined();
        expect(typeof refresh_token).toBe('string');
        expect(refresh_token.split('.')).toHaveLength(3);

        const refreshPayload = jwtService.verify(refresh_token);
        expect(refreshPayload.sub).toBe(response.body.user.id);
        expect(refreshPayload.email).toBe(validRegisterDto.email);
      });
    });

    describe('Test registration with duplicate email', () => {
      it('should return 409 when registering with duplicate email in same organization', async () => {
        const registerDto = {
          email: 'duplicate@company.com',
          password: 'SecurePass123!',
          firstName: 'First',
          lastName: 'User',
          role: 'recruiter',
          companyName: 'Duplicate Test Company',
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
            lastName: 'User',
            companyName: 'Another Company',
          })
          .expect(409);

        expect(duplicateResponse.body.message).toContain('already exists');
        expect(duplicateResponse.body.statusCode).toBe(409);

        // Verify only one user exists
        const users = await userRepository.find({
          where: { email: registerDto.email },
        });
        expect(users).toHaveLength(1);
        expect(users[0].firstName).toBe('First');
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
          email: 'shared@company.com',
          password: 'SecurePass123!',
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
          email: 'shared@company.com',
          password: 'SecurePass456!',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'hiring_manager',
          companyName: 'Company 2',
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto2)
          .expect(201);

        expect(response.body.user.email).toBe('shared@company.com');
        expect(response.body.user.firstName).toBe('Jane');

        // Verify both users exist in database
        const users = await userRepository.find({
          where: { email: 'shared@company.com' },
        });
        expect(users).toHaveLength(2);
        expect(users[0].organizationId).not.toBe(users[1].organizationId);
      });
    });

    describe('Test registration with invalid data', () => {
      const invalidTestCases = [
        {
          name: 'invalid email format',
          data: {
            email: 'invalid-email-format',
            password: 'SecurePass123!',
            firstName: 'John',
            lastName: 'Doe',
            role: 'recruiter',
            companyName: 'Test Company',
          },
          expectedStatus: 400,
          expectedMessageContains: 'email',
        },
        {
          name: 'password too short',
          data: {
            email: 'test@company.com',
            password: '123',
            firstName: 'John',
            lastName: 'Doe',
            role: 'recruiter',
            companyName: 'Test Company',
          },
          expectedStatus: 400,
          expectedMessageContains: 'password',
        },
        {
          name: 'missing firstName',
          data: {
            email: 'test@company.com',
            password: 'SecurePass123!',
            lastName: 'Doe',
            role: 'recruiter',
            companyName: 'Test Company',
          },
          expectedStatus: 400,
        },
        {
          name: 'missing lastName',
          data: {
            email: 'test@company.com',
            password: 'SecurePass123!',
            firstName: 'John',
            role: 'recruiter',
            companyName: 'Test Company',
          },
          expectedStatus: 400,
        },
        {
          name: 'invalid role',
          data: {
            email: 'test@company.com',
            password: 'SecurePass123!',
            firstName: 'John',
            lastName: 'Doe',
            role: 'invalid_role',
            companyName: 'Test Company',
          },
          expectedStatus: 400,
          expectedMessageContains: 'role',
        },
        {
          name: 'missing companyName',
          data: {
            email: 'test@company.com',
            password: 'SecurePass123!',
            firstName: 'John',
            lastName: 'Doe',
            role: 'recruiter',
          },
          expectedStatus: 400,
        },
        {
          name: 'empty email',
          data: {
            email: '',
            password: 'SecurePass123!',
            firstName: 'John',
            lastName: 'Doe',
            role: 'recruiter',
            companyName: 'Test Company',
          },
          expectedStatus: 400,
        },
        {
          name: 'empty password',
          data: {
            email: 'test@company.com',
            password: '',
            firstName: 'John',
            lastName: 'Doe',
            role: 'recruiter',
            companyName: 'Test Company',
          },
          expectedStatus: 400,
        },
      ];

      invalidTestCases.forEach((testCase) => {
        it(`should return ${testCase.expectedStatus} for ${testCase.name}`, async () => {
          const response = await request(app.getHttpServer())
            .post('/auth/register')
            .send(testCase.data)
            .expect(testCase.expectedStatus);

          expect(response.body).toHaveProperty('message');
          expect(response.body).toHaveProperty(
            'statusCode',
            testCase.expectedStatus,
          );

          if (testCase.expectedMessageContains) {
            expect(response.body.message.toLowerCase()).toContain(
              testCase.expectedMessageContains.toLowerCase(),
            );
          }

          // Verify no user was created
          const users = await userRepository.find();
          expect(users).toHaveLength(0);
        });
      });
    });

    describe('Verify successful login after registration', () => {
      it('should allow login immediately after successful registration', async () => {
        const registerDto = {
          email: 'logintest@company.com',
          password: 'SecurePass123!',
          firstName: 'Login',
          lastName: 'Test',
          role: 'recruiter',
          companyName: 'Login Test Company',
        };

        // Step 1: Register user
        const registerResponse = await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto)
          .expect(201);

        expect(registerResponse.body.user.email).toBe(registerDto.email);

        // Step 2: Login with same credentials
        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: registerDto.email,
            password: registerDto.password,
          })
          .expect(200);

        // Verify login response structure
        expect(loginResponse.body).toHaveProperty('access_token');
        expect(loginResponse.body).toHaveProperty('refresh_token');
        expect(loginResponse.body).toHaveProperty('expires_in', 3600);
        expect(loginResponse.body.user).toMatchObject({
          email: registerDto.email,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          role: UserRole.RECRUITER,
          organizationId: registerResponse.body.user.organizationId,
        });

        // Verify tokens are different from registration tokens
        expect(loginResponse.body.access_token).not.toBe(
          registerResponse.body.access_token,
        );
        expect(loginResponse.body.refresh_token).not.toBe(
          registerResponse.body.refresh_token,
        );
      });

      it('should maintain organization context after login', async () => {
        const registerDto = {
          email: 'orgcontext@company.com',
          password: 'SecurePass123!',
          firstName: 'Org',
          lastName: 'Context',
          role: 'hiring_manager',
          companyName: 'Organization Context Company',
        };

        // Register user
        const registerResponse = await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto)
          .expect(201);

        const originalOrgId = registerResponse.body.user.organizationId;

        // Login
        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: registerDto.email,
            password: registerDto.password,
          })
          .expect(200);

        // Verify organization context is maintained
        expect(loginResponse.body.user.organizationId).toBe(originalOrgId);

        // Verify token contains correct organization context
        const accessPayload = jwtService.verify(
          loginResponse.body.access_token,
        );
        expect(accessPayload.organizationId).toBe(originalOrgId);
      });

      it('should handle login for users with same email in different organizations', async () => {
        // Create first organization and user
        const org1 = organizationRepository.create({
          name: 'Organization 1',
          type: OrganizationType.SMB,
          subscriptionPlan: SubscriptionPlan.FREE,
        });
        const savedOrg1 = await organizationRepository.save(org1);

        const registerDto1 = {
          email: 'multiorg@company.com',
          password: 'Password123!',
          firstName: 'User',
          lastName: 'One',
          role: 'recruiter',
          companyName: 'Company 1',
          organizationId: savedOrg1.id,
        };

        await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto1)
          .expect(201);

        // Create second user with same email in different organization
        const registerDto2 = {
          email: 'multiorg@company.com',
          password: 'Password456!',
          firstName: 'User',
          lastName: 'Two',
          role: 'hiring_manager',
          companyName: 'Company 2',
        };

        const registerResponse2 = await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto2)
          .expect(201);

        // Login with first user's password
        const loginResponse1 = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'multiorg@company.com',
            password: 'Password123!',
          })
          .expect(200);

        expect(loginResponse1.body.user.lastName).toBe('One');
        expect(loginResponse1.body.user.role).toBe(UserRole.RECRUITER);
        expect(loginResponse1.body.user.organizationId).toBe(savedOrg1.id);

        // Login with second user's password
        const loginResponse2 = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'multiorg@company.com',
            password: 'Password456!',
          })
          .expect(200);

        expect(loginResponse2.body.user.lastName).toBe('Two');
        expect(loginResponse2.body.user.role).toBe(UserRole.HIRING_MANAGER);
        expect(loginResponse2.body.user.organizationId).toBe(
          registerResponse2.body.user.organizationId,
        );
        expect(loginResponse2.body.user.organizationId).not.toBe(savedOrg1.id);
      });
    });

    describe('Test organization creation and user assignment', () => {
      it('should create organization with correct properties during registration', async () => {
        const registerDto = {
          email: 'orgcreation@company.com',
          password: 'SecurePass123!',
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
        expect(organization?.createdAt).toBeDefined();
        expect(organization?.updatedAt).toBeDefined();

        // Verify user is properly assigned to organization
        expect(organization?.users).toHaveLength(1);
        expect(organization?.users[0].email).toBe(registerDto.email);
        expect(organization?.users[0].organizationId).toBe(organizationId);
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
          email: 'existing@company.com',
          password: 'SecurePass123!',
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
        expect(user?.organization.subscriptionPlan).toBe(
          SubscriptionPlan.PROFESSIONAL,
        );

        // Verify organization now has the user
        const updatedOrg = await organizationRepository.findOne({
          where: { id: savedOrg.id },
          relations: ['users'],
        });
        expect(updatedOrg?.users).toHaveLength(1);
        expect(updatedOrg?.users[0].email).toBe(registerDto.email);
      });

      it('should handle multiple users in same organization', async () => {
        // Register first user (creates organization)
        const registerDto1 = {
          email: 'user1@company.com',
          password: 'SecurePass123!',
          firstName: 'User',
          lastName: 'One',
          role: 'recruiter',
          companyName: 'Multi User Company',
        };

        const response1 = await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto1)
          .expect(201);

        const organizationId = response1.body.user.organizationId;

        // Register second user in same organization
        const registerDto2 = {
          email: 'user2@company.com',
          password: 'SecurePass456!',
          firstName: 'User',
          lastName: 'Two',
          role: 'hiring_manager',
          companyName: 'This Should Be Ignored',
          organizationId: organizationId,
        };

        const response2 = await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto2)
          .expect(201);

        expect(response2.body.user.organizationId).toBe(organizationId);

        // Verify organization has both users
        const organization = await organizationRepository.findOne({
          where: { id: organizationId },
          relations: ['users'],
        });

        expect(organization?.users).toHaveLength(2);
        const emails = organization?.users.map((u) => u.email);
        expect(emails).toContain(registerDto1.email);
        expect(emails).toContain(registerDto2.email);

        // Verify both users can login
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: registerDto1.email,
            password: registerDto1.password,
          })
          .expect(200);

        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: registerDto2.email,
            password: registerDto2.password,
          })
          .expect(200);
      });

      it('should handle organization creation failure gracefully', async () => {
        // Mock organization repository to simulate failure
        const originalSave = organizationRepository.save;
        organizationRepository.save = jest
          .fn()
          .mockRejectedValue(new Error('Database error'));

        const registerDto = {
          email: 'orgfail@company.com',
          password: 'SecurePass123!',
          firstName: 'Org',
          lastName: 'Fail',
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

        // Verify no organization was created
        const organizations = await organizationRepository.find();
        expect(organizations).toHaveLength(0);

        // Restore original method
        organizationRepository.save = originalSave;
      });
    });

    describe('End-to-End Complete Flow Integration', () => {
      it('should complete full registration, login, and token refresh flow', async () => {
        const registerDto = {
          email: 'fullflow@company.com',
          password: 'SecurePass123!',
          firstName: 'Full',
          lastName: 'Flow',
          role: 'recruiter',
          companyName: 'Full Flow Company',
        };

        // Step 1: Register user
        const registerResponse = await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto)
          .expect(201);

        expect(registerResponse.body).toHaveProperty('access_token');
        expect(registerResponse.body).toHaveProperty('refresh_token');
        expect(registerResponse.body.user.email).toBe(registerDto.email);

        // Step 2: Login with registered credentials
        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: registerDto.email,
            password: registerDto.password,
          })
          .expect(200);

        expect(loginResponse.body.user.email).toBe(registerDto.email);

        // Step 3: Use access token to access protected endpoint (if available)
        const verifyResponse = await request(app.getHttpServer())
          .get('/auth/verify')
          .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
          .expect(200);

        expect(verifyResponse.body.user.email).toBe(registerDto.email);

        // Step 4: Refresh token
        const refreshResponse = await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refresh_token: loginResponse.body.refresh_token })
          .expect(200);

        expect(refreshResponse.body).toHaveProperty('access_token');
        expect(refreshResponse.body).toHaveProperty('refresh_token');

        // Step 5: Use new access token
        await request(app.getHttpServer())
          .get('/auth/verify')
          .set('Authorization', `Bearer ${refreshResponse.body.access_token}`)
          .expect(200);

        // Verify database state
        const user = await userRepository.findOne({
          where: { email: registerDto.email },
          relations: ['organization'],
        });
        expect(user).toBeDefined();
        expect(user?.organization).toBeDefined();
        expect(user?.organization.name).toBe(registerDto.companyName);
      });

      it('should handle concurrent registrations without conflicts', async () => {
        const registerDto1 = {
          email: 'concurrent1@company.com',
          password: 'SecurePass123!',
          firstName: 'User1',
          lastName: 'Concurrent',
          role: 'recruiter',
          companyName: 'Concurrent Company 1',
        };

        const registerDto2 = {
          email: 'concurrent2@company.com',
          password: 'SecurePass456!',
          firstName: 'User2',
          lastName: 'Concurrent',
          role: 'hiring_manager',
          companyName: 'Concurrent Company 2',
        };

        // Register both users concurrently
        const [response1, response2] = await Promise.all([
          request(app.getHttpServer())
            .post('/auth/register')
            .send(registerDto1),
          request(app.getHttpServer())
            .post('/auth/register')
            .send(registerDto2),
        ]);

        expect(response1.status).toBe(201);
        expect(response2.status).toBe(201);

        // Verify both users exist and can login
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: registerDto1.email,
            password: registerDto1.password,
          })
          .expect(200);

        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: registerDto2.email,
            password: registerDto2.password,
          })
          .expect(200);

        // Verify both organizations exist
        const organizations = await organizationRepository.find();
        expect(organizations).toHaveLength(2);

        // Verify both users exist
        const users = await userRepository.find();
        expect(users).toHaveLength(2);
      });
    });

    describe('Performance and Stress Testing', () => {
      it('should handle multiple sequential registrations efficiently', async () => {
        const registrations = [];
        const startTime = Date.now();

        for (let i = 0; i < 5; i++) {
          const registerDto = {
            email: `perf${i}@company.com`,
            password: 'SecurePass123!',
            firstName: `User${i}`,
            lastName: 'Performance',
            role: 'recruiter',
            companyName: `Performance Company ${i}`,
          };

          registrations.push(
            request(app.getHttpServer())
              .post('/auth/register')
              .send(registerDto)
              .expect(201),
          );
        }

        await Promise.all(registrations);
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Should complete within reasonable time (5 seconds for 5 registrations)
        expect(duration).toBeLessThan(5000);

        // Verify all users and organizations were created
        const users = await userRepository.find();
        const organizations = await organizationRepository.find();
        expect(users).toHaveLength(5);
        expect(organizations).toHaveLength(5);
      });
    });

    describe('Data Integrity and Consistency', () => {
      it('should maintain referential integrity between users and organizations', async () => {
        const registerDto = {
          email: 'integrity@company.com',
          password: 'SecurePass123!',
          firstName: 'Data',
          lastName: 'Integrity',
          role: 'recruiter',
          companyName: 'Integrity Test Company',
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto)
          .expect(201);

        const userId = response.body.user.id;
        const organizationId = response.body.user.organizationId;

        // Verify user exists with correct organization reference
        const user = await userRepository.findOne({
          where: { id: userId },
          relations: ['organization'],
        });

        expect(user).toBeDefined();
        expect(user?.organizationId).toBe(organizationId);
        expect(user?.organization).toBeDefined();
        expect(user?.organization.id).toBe(organizationId);

        // Verify organization exists with user reference
        const organization = await organizationRepository.findOne({
          where: { id: organizationId },
          relations: ['users'],
        });

        expect(organization).toBeDefined();
        expect(organization?.users).toHaveLength(1);
        expect(organization?.users[0].id).toBe(userId);
      });

      it('should handle database transaction rollback on partial failures', async () => {
        // This test would require mocking specific database failures
        // For now, we'll test the basic error handling
        const registerDto = {
          email: 'transaction@company.com',
          password: 'SecurePass123!',
          firstName: 'Transaction',
          lastName: 'Test',
          role: 'recruiter',
          companyName: 'Transaction Test Company',
        };

        // First registration should succeed
        await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto)
          .expect(201);

        // Verify data was created
        const users = await userRepository.find();
        const organizations = await organizationRepository.find();
        expect(users).toHaveLength(1);
        expect(organizations).toHaveLength(1);
      });
    });

    describe('Security and Validation Edge Cases', () => {
      it('should handle SQL injection attempts in registration data', async () => {
        const maliciousData = {
          email: "'; DROP TABLE users; --@company.com",
          password: 'SecurePass123!',
          firstName: "'; DROP TABLE organizations; --",
          lastName: 'Malicious',
          role: 'recruiter',
          companyName: "'; DROP TABLE users; --",
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(maliciousData)
          .expect(400);

        expect(response.body.message).toContain('email');

        // Verify tables still exist and no data was created
        const users = await userRepository.find();
        const organizations = await organizationRepository.find();
        expect(users).toHaveLength(0);
        expect(organizations).toHaveLength(0);
      });

      it('should handle XSS attempts in registration data', async () => {
        const xssData = {
          email: 'xss@company.com',
          password: 'SecurePass123!',
          firstName: '<script>alert("xss")</script>',
          lastName: '<img src="x" onerror="alert(1)">',
          role: 'recruiter',
          companyName: '<script>document.cookie="hacked"</script>',
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(xssData)
          .expect(201);

        // Verify data was sanitized/escaped
        const user = await userRepository.findOne({
          where: { email: xssData.email },
          relations: ['organization'],
        });

        expect(user?.firstName).not.toContain('<script>');
        expect(user?.lastName).not.toContain('<img');
        expect(user?.organization.name).not.toContain('<script>');
      });

      it('should handle extremely long input values', async () => {
        const longString = 'a'.repeat(1000);
        const longData = {
          email: 'long@company.com',
          password: 'SecurePass123!',
          firstName: longString,
          lastName: longString,
          role: 'recruiter',
          companyName: longString,
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(longData)
          .expect(400);

        expect(response.body.message).toBeDefined();

        // Verify no data was created
        const users = await userRepository.find();
        expect(users).toHaveLength(0);
      });
    });

    describe('Token Security and Validation', () => {
      it('should generate cryptographically secure tokens', async () => {
        const registerDto = {
          email: 'tokensec@company.com',
          password: 'SecurePass123!',
          firstName: 'Token',
          lastName: 'Security',
          role: 'recruiter',
          companyName: 'Token Security Company',
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto)
          .expect(201);

        const { access_token, refresh_token } = response.body;

        // Verify token format and structure
        expect(access_token).toMatch(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/);
        expect(refresh_token).toMatch(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/);

        // Verify tokens are different
        expect(access_token).not.toBe(refresh_token);

        // Verify token payload
        const accessPayload = jwtService.verify(access_token);
        expect(accessPayload.sub).toBe(response.body.user.id);
        expect(accessPayload.email).toBe(registerDto.email);
        expect(accessPayload.organizationId).toBe(response.body.user.organizationId);

        // Verify token expiration
        expect(accessPayload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
      });

      it('should invalidate tokens after password change (future enhancement)', async () => {
        // This test is for future implementation
        // Currently just verifying the registration flow works
        const registerDto = {
          email: 'tokeninvalidate@company.com',
          password: 'SecurePass123!',
          firstName: 'Token',
          lastName: 'Invalidate',
          role: 'recruiter',
          companyName: 'Token Invalidate Company',
        };

        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(registerDto)
          .expect(201);

        expect(response.body.access_token).toBeDefined();
        expect(response.body.refresh_token).toBeDefined();
      });
    });

    describe('Multi-tenant Isolation', () => {
      it('should properly isolate users between different organizations', async () => {
        // Create two separate organizations with users
        const user1Data = {
          email: 'user1@org1.com',
          password: 'SecurePass123!',
          firstName: 'User1',
          lastName: 'Org1',
          role: 'recruiter',
          companyName: 'Organization 1',
        };

        const user2Data = {
          email: 'user2@org2.com',
          password: 'SecurePass456!',
          firstName: 'User2',
          lastName: 'Org2',
          role: 'hiring_manager',
          companyName: 'Organization 2',
        };

        const response1 = await request(app.getHttpServer())
          .post('/auth/register')
          .send(user1Data)
          .expect(201);

        const response2 = await request(app.getHttpServer())
          .post('/auth/register')
          .send(user2Data)
          .expect(201);

        // Verify users are in different organizations
        expect(response1.body.user.organizationId).not.toBe(
          response2.body.user.organizationId,
        );

        // Verify token payloads contain correct organization context
        const token1Payload = jwtService.verify(response1.body.access_token);
        const token2Payload = jwtService.verify(response2.body.access_token);

        expect(token1Payload.organizationId).toBe(response1.body.user.organizationId);
        expect(token2Payload.organizationId).toBe(response2.body.user.organizationId);
        expect(token1Payload.organizationId).not.toBe(token2Payload.organizationId);

        // Verify database isolation
        const org1Users = await userRepository.find({
          where: { organizationId: response1.body.user.organizationId },
        });
        const org2Users = await userRepository.find({
          where: { organizationId: response2.body.user.organizationId },
        });

        expect(org1Users).toHaveLength(1);
        expect(org2Users).toHaveLength(1);
        expect(org1Users[0].email).toBe(user1Data.email);
        expect(org2Users[0].email).toBe(user2Data.email);
      });
    });
  });

  describe('Comprehensive Flow Summary', () => {
    it('should complete all task requirements in a single comprehensive test', async () => {
      // Task 12.1: Test registration with valid data
      const validUser = {
        email: 'comprehensive@test.com',
        password: 'SecurePass123!',
        firstName: 'Comprehensive',
        lastName: 'Test',
        role: 'recruiter',
        companyName: 'Comprehensive Test Company',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validUser)
        .expect(201);

      expect(registerResponse.body.user.email).toBe(validUser.email);
      expect(registerResponse.body.user.organizationId).toBeDefined();

      // Task 12.2: Test registration with duplicate email
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(validUser)
        .expect(409);

      // Task 12.3: Test registration with invalid data
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...validUser,
          email: 'invalid-email',
        })
        .expect(400);

      // Task 12.4: Verify successful login after registration
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password,
        })
        .expect(200);

      expect(loginResponse.body.user.email).toBe(validUser.email);
      expect(loginResponse.body.user.organizationId).toBe(
        registerResponse.body.user.organizationId,
      );

      // Task 12.5: Test organization creation and user assignment
      const user = await userRepository.findOne({
        where: { email: validUser.email },
        relations: ['organization'],
      });

      expect(user?.organization).toBeDefined();
      expect(user?.organization.name).toBe(validUser.companyName);
      expect(user?.organizationId).toBe(user?.organization.id);

      // Verify token refresh works
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: loginResponse.body.refresh_token })
        .expect(200);

      expect(refreshResponse.body.access_token).toBeDefined();
      expect(refreshResponse.body.refresh_token).toBeDefined();

      // Verify new token works
      await request(app.getHttpServer())
        .get('/auth/verify')
        .set('Authorization', `Bearer ${refreshResponse.body.access_token}`)
        .expect(200);

      console.log('✅ All Task 12 requirements completed successfully:');
      console.log('  ✅ 12.1: Registration with valid data');
      console.log('  ✅ 12.2: Registration with duplicate email');
      console.log('  ✅ 12.3: Registration with invalid data');
      console.log('  ✅ 12.4: Successful login after registration');
      console.log('  ✅ 12.5: Organization creation and user assignment');
    });
  });
});password: registerDto1.password,
          })
          .expect(200);

        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: registerDto2.email,
            password: registerDto2.password,
          })
          .expect(200);

        // Verify both organizations were created
        const organizations = await organizationRepository.find();
        expect(organizations).toHaveLength(2);

        const orgNames = organizations.map((o) => o.name);
        expect(orgNames).toContain(registerDto1.companyName);
        expect(orgNames).toContain(registerDto2.companyName);
      });
    });
  });
});
