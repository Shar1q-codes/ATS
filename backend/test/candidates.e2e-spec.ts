import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { CandidatesModule } from '../src/candidates/candidates.module';
import { AuthModule } from '../src/auth/auth.module';
import { User, UserRole } from '../src/entities/user.entity';
import { Candidate } from '../src/entities/candidate.entity';
import { ParsedResumeData } from '../src/entities/parsed-resume-data.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('Candidates API (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let candidateRepository: Repository<Candidate>;
  let parsedResumeDataRepository: Repository<ParsedResumeData>;
  let accessToken: string;
  let userId: string;

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
          entities: [User, Candidate, ParsedResumeData],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([User, Candidate, ParsedResumeData]),
        AuthModule,
        CandidatesModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    candidateRepository = moduleFixture.get<Repository<Candidate>>(
      getRepositoryToken(Candidate),
    );
    parsedResumeDataRepository = moduleFixture.get<
      Repository<ParsedResumeData>
    >(getRepositoryToken(ParsedResumeData));

    await app.init();

    // Create test user and get access token
    const registerDto = {
      email: 'candidates@example.com',
      password: 'password123',
      firstName: 'Candidates',
      lastName: 'User',
      role: UserRole.RECRUITER,
    };

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto);

    accessToken = registerResponse.body.access_token;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up candidate-related data before each test
    await parsedResumeDataRepository.clear();
    await candidateRepository.clear();
  });

  describe('/candidates (POST)', () => {
    it('should create a new candidate with consent', async () => {
      const createDto = {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        location: 'San Francisco, CA',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        portfolioUrl: 'https://johndoe.dev',
        consentGiven: true,
      };

      const response = await request(app.getHttpServer())
        .post('/candidates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        email: createDto.email,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
        phone: createDto.phone,
        location: createDto.location,
        linkedinUrl: createDto.linkedinUrl,
        portfolioUrl: createDto.portfolioUrl,
        consentGiven: true,
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('consentDate');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Verify in database
      const candidate = await candidateRepository.findOne({
        where: { id: response.body.id },
      });
      expect(candidate).toBeDefined();
      expect(candidate?.email).toBe(createDto.email);
      expect(candidate?.consentGiven).toBe(true);
      expect(candidate?.consentDate).toBeDefined();
    });

    it('should create candidate without consent date when consent not given', async () => {
      const createDto = {
        email: 'jane.doe@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        consentGiven: false,
      };

      const response = await request(app.getHttpServer())
        .post('/candidates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body.consentGiven).toBe(false);
      expect(response.body.consentDate).toBeNull();

      // Verify in database
      const candidate = await candidateRepository.findOne({
        where: { id: response.body.id },
      });
      expect(candidate?.consentGiven).toBe(false);
      expect(candidate?.consentDate).toBeNull();
    });

    it('should return 409 when candidate with email already exists', async () => {
      const createDto = {
        email: 'duplicate@example.com',
        firstName: 'Duplicate',
        lastName: 'User',
        consentGiven: true,
      };

      // Create first candidate
      await request(app.getHttpServer())
        .post('/candidates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201);

      // Try to create duplicate
      await request(app.getHttpServer())
        .post('/candidates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(409);
    });

    it('should return 401 without authorization', async () => {
      const createDto = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        consentGiven: true,
      };

      await request(app.getHttpServer())
        .post('/candidates')
        .send(createDto)
        .expect(401);
    });

    it('should return 400 for invalid input', async () => {
      const invalidDto = {
        email: 'invalid-email',
        firstName: '',
        lastName: '',
      };

      await request(app.getHttpServer())
        .post('/candidates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('/candidates (GET)', () => {
    beforeEach(async () => {
      // Create test candidates
      const candidate1 = candidateRepository.create({
        email: 'candidate1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        consentGiven: true,
        consentDate: new Date(),
      });
      const candidate2 = candidateRepository.create({
        email: 'candidate2@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        consentGiven: false,
        consentDate: null,
      });
      await candidateRepository.save([candidate1, candidate2]);
    });

    it('should return all candidates', async () => {
      const response = await request(app.getHttpServer())
        .get('/candidates')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('email');
      expect(response.body[0]).toHaveProperty('firstName');
      expect(response.body[0]).toHaveProperty('lastName');
      expect(response.body[0]).toHaveProperty('consentGiven');
    });

    it('should return 401 without authorization', async () => {
      await request(app.getHttpServer()).get('/candidates').expect(401);
    });
  });

  describe('/candidates/:id (GET)', () => {
    let candidateId: string;

    beforeEach(async () => {
      const candidate = candidateRepository.create({
        email: 'single@example.com',
        firstName: 'Single',
        lastName: 'Candidate',
        phone: '+1234567890',
        consentGiven: true,
        consentDate: new Date(),
      });
      const saved = await candidateRepository.save(candidate);
      candidateId = saved.id;
    });

    it('should return candidate by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/candidates/${candidateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: candidateId,
        email: 'single@example.com',
        firstName: 'Single',
        lastName: 'Candidate',
        phone: '+1234567890',
        consentGiven: true,
      });
    });

    it('should return 404 for non-existent candidate', async () => {
      await request(app.getHttpServer())
        .get('/candidates/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 401 without authorization', async () => {
      await request(app.getHttpServer())
        .get(`/candidates/${candidateId}`)
        .expect(401);
    });
  });

  describe('/candidates/:id (PUT)', () => {
    let candidateId: string;

    beforeEach(async () => {
      const candidate = candidateRepository.create({
        email: 'update@example.com',
        firstName: 'Update',
        lastName: 'Candidate',
        consentGiven: false,
        consentDate: null,
      });
      const saved = await candidateRepository.save(candidate);
      candidateId = saved.id;
    });

    it('should update candidate information', async () => {
      const updateDto = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+9876543210',
        location: 'New York, NY',
      };

      const response = await request(app.getHttpServer())
        .put(`/candidates/${candidateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: candidateId,
        firstName: updateDto.firstName,
        lastName: updateDto.lastName,
        phone: updateDto.phone,
        location: updateDto.location,
      });

      // Verify in database
      const updated = await candidateRepository.findOne({
        where: { id: candidateId },
      });
      expect(updated?.firstName).toBe(updateDto.firstName);
      expect(updated?.phone).toBe(updateDto.phone);
    });

    it('should update consent and set consent date', async () => {
      const updateDto = {
        consentGiven: true,
      };

      const response = await request(app.getHttpServer())
        .put(`/candidates/${candidateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.consentGiven).toBe(true);
      expect(response.body.consentDate).toBeDefined();

      // Verify in database
      const updated = await candidateRepository.findOne({
        where: { id: candidateId },
      });
      expect(updated?.consentGiven).toBe(true);
      expect(updated?.consentDate).toBeDefined();
    });

    it('should return 409 when updating to existing email', async () => {
      // Create another candidate
      const otherCandidate = candidateRepository.create({
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'Candidate',
        consentGiven: true,
      });
      await candidateRepository.save(otherCandidate);

      const updateDto = {
        email: 'other@example.com', // Try to use existing email
      };

      await request(app.getHttpServer())
        .put(`/candidates/${candidateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(409);
    });

    it('should return 404 for non-existent candidate', async () => {
      const updateDto = {
        firstName: 'Updated',
      };

      await request(app.getHttpServer())
        .put('/candidates/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(404);
    });

    it('should return 401 without authorization', async () => {
      const updateDto = {
        firstName: 'Updated',
      };

      await request(app.getHttpServer())
        .put(`/candidates/${candidateId}`)
        .send(updateDto)
        .expect(401);
    });
  });

  describe('/candidates/:id/consent (PUT)', () => {
    let candidateId: string;

    beforeEach(async () => {
      const candidate = candidateRepository.create({
        email: 'consent@example.com',
        firstName: 'Consent',
        lastName: 'Test',
        consentGiven: false,
        consentDate: null,
      });
      const saved = await candidateRepository.save(candidate);
      candidateId = saved.id;
    });

    it('should grant consent', async () => {
      const response = await request(app.getHttpServer())
        .put(`/candidates/${candidateId}/consent`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ consentGiven: true })
        .expect(200);

      expect(response.body.consentGiven).toBe(true);
      expect(response.body.consentDate).toBeDefined();

      // Verify in database
      const updated = await candidateRepository.findOne({
        where: { id: candidateId },
      });
      expect(updated?.consentGiven).toBe(true);
      expect(updated?.consentDate).toBeDefined();
    });

    it('should revoke consent', async () => {
      // First grant consent
      await candidateRepository.update(candidateId, {
        consentGiven: true,
        consentDate: new Date(),
      });

      const response = await request(app.getHttpServer())
        .put(`/candidates/${candidateId}/consent`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ consentGiven: false })
        .expect(200);

      expect(response.body.consentGiven).toBe(false);
      expect(response.body.consentDate).toBeNull();

      // Verify in database
      const updated = await candidateRepository.findOne({
        where: { id: candidateId },
      });
      expect(updated?.consentGiven).toBe(false);
      expect(updated?.consentDate).toBeNull();
    });

    it('should return 404 for non-existent candidate', async () => {
      await request(app.getHttpServer())
        .put('/candidates/non-existent-id/consent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ consentGiven: true })
        .expect(404);
    });

    it('should return 401 without authorization', async () => {
      await request(app.getHttpServer())
        .put(`/candidates/${candidateId}/consent`)
        .send({ consentGiven: true })
        .expect(401);
    });
  });

  describe('/candidates/:id (DELETE)', () => {
    let candidateId: string;

    beforeEach(async () => {
      const candidate = candidateRepository.create({
        email: 'delete@example.com',
        firstName: 'Delete',
        lastName: 'Test',
        consentGiven: true,
      });
      const saved = await candidateRepository.save(candidate);
      candidateId = saved.id;
    });

    it('should delete candidate', async () => {
      await request(app.getHttpServer())
        .delete(`/candidates/${candidateId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify deletion in database
      const deleted = await candidateRepository.findOne({
        where: { id: candidateId },
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent candidate', async () => {
      await request(app.getHttpServer())
        .delete('/candidates/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 401 without authorization', async () => {
      await request(app.getHttpServer())
        .delete(`/candidates/${candidateId}`)
        .expect(401);
    });
  });

  describe('Data persistence and GDPR compliance', () => {
    it('should handle candidate data with proper consent tracking', async () => {
      const createDto = {
        email: 'gdpr@example.com',
        firstName: 'GDPR',
        lastName: 'Test',
        phone: '+1234567890',
        location: 'EU',
        consentGiven: true,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/candidates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto);

      const candidateId = createResponse.body.id;

      // Verify consent tracking
      const candidate = await candidateRepository.findOne({
        where: { id: candidateId },
      });

      expect(candidate?.consentGiven).toBe(true);
      expect(candidate?.consentDate).toBeDefined();
      expect(candidate?.createdAt).toBeDefined();
      expect(candidate?.updatedAt).toBeDefined();

      // Test consent revocation (GDPR right to withdraw)
      await request(app.getHttpServer())
        .put(`/candidates/${candidateId}/consent`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ consentGiven: false });

      const updatedCandidate = await candidateRepository.findOne({
        where: { id: candidateId },
      });

      expect(updatedCandidate?.consentGiven).toBe(false);
      expect(updatedCandidate?.consentDate).toBeNull();

      // Test right to be forgotten (GDPR deletion)
      await request(app.getHttpServer())
        .delete(`/candidates/${candidateId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      const deletedCandidate = await candidateRepository.findOne({
        where: { id: candidateId },
      });

      expect(deletedCandidate).toBeNull();
    });

    it('should handle concurrent candidate operations', async () => {
      const createDto1 = {
        email: 'concurrent1@example.com',
        firstName: 'Concurrent1',
        lastName: 'Test',
        consentGiven: true,
      };

      const createDto2 = {
        email: 'concurrent2@example.com',
        firstName: 'Concurrent2',
        lastName: 'Test',
        consentGiven: true,
      };

      // Create both candidates concurrently
      const [response1, response2] = await Promise.all([
        request(app.getHttpServer())
          .post('/candidates')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createDto1),
        request(app.getHttpServer())
          .post('/candidates')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createDto2),
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      // Verify both exist in database
      const candidates = await candidateRepository.find();
      expect(candidates).toHaveLength(2);

      const emails = candidates.map((c) => c.email);
      expect(emails).toContain(createDto1.email);
      expect(emails).toContain(createDto2.email);
    });
  });
});
