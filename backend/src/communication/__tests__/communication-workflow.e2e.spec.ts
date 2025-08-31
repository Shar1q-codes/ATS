import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { CommunicationModule } from '../communication.module';
import {
  User,
  UserRole,
  Candidate,
  Application,
  PipelineStage,
  EmailTemplate,
  EmailTemplateType,
  EmailTemplateStatus,
  CommunicationHistory,
  CandidateCommunicationPreferences,
  CommunicationFrequency,
} from '../../entities';
import { AuthModule } from '../../auth/auth.module';
import { JwtService } from '@nestjs/jwt';

describe('Communication Workflow (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let candidateRepository: Repository<Candidate>;
  let applicationRepository: Repository<Application>;
  let emailTemplateRepository: Repository<EmailTemplate>;
  let communicationHistoryRepository: Repository<CommunicationHistory>;
  let preferencesRepository: Repository<CandidateCommunicationPreferences>;
  let jwtService: JwtService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            User,
            Candidate,
            Application,
            EmailTemplate,
            CommunicationHistory,
            CandidateCommunicationPreferences,
          ],
          synchronize: true,
        }),
        AuthModule,
        CommunicationModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = moduleFixture.get('UserRepository');
    candidateRepository = moduleFixture.get('CandidateRepository');
    applicationRepository = moduleFixture.get('ApplicationRepository');
    emailTemplateRepository = moduleFixture.get('EmailTemplateRepository');
    communicationHistoryRepository = moduleFixture.get(
      'CommunicationHistoryRepository',
    );
    preferencesRepository = moduleFixture.get(
      'CandidateCommunicationPreferencesRepository',
    );
    jwtService = moduleFixture.get(JwtService);

    // Create test user and get auth token
    const testUser = await userRepository.save({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.RECRUITER,
      passwordHash: 'hashedpassword',
    });

    authToken = jwtService.sign({ sub: testUser.id, email: testUser.email });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up data before each test
    await communicationHistoryRepository.clear();
    await preferencesRepository.clear();
    await applicationRepository.clear();
    await candidateRepository.clear();
    await emailTemplateRepository.clear();
  });

  describe('Communication History Workflow', () => {
    it('should create and retrieve communication history', async () => {
      // Create test candidate
      const candidate = await candidateRepository.save({
        email: 'candidate@example.com',
        firstName: 'John',
        lastName: 'Doe',
        consentGiven: true,
        totalExperience: 5,
      });

      // Create communication history
      const createDto = {
        type: 'email',
        direction: 'outbound',
        subject: 'Application Update',
        content: 'Your application has been reviewed.',
        candidateId: candidate.id,
      };

      const response = await request(app.getHttpServer())
        .post('/communication-history')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        type: 'email',
        direction: 'outbound',
        subject: 'Application Update',
        candidateId: candidate.id,
      });

      // Retrieve communication history for candidate
      const historyResponse = await request(app.getHttpServer())
        .get(`/communication-history/candidate/${candidate.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body).toHaveLength(1);
      expect(historyResponse.body[0]).toMatchObject({
        subject: 'Application Update',
        candidateId: candidate.id,
      });
    });

    it('should get communication statistics', async () => {
      const candidate = await candidateRepository.save({
        email: 'candidate@example.com',
        firstName: 'John',
        lastName: 'Doe',
        consentGiven: true,
        totalExperience: 5,
      });

      // Create multiple communications
      await communicationHistoryRepository.save([
        {
          type: 'email',
          direction: 'outbound',
          subject: 'Email 1',
          content: 'Content 1',
          candidateId: candidate.id,
          isRead: false,
        },
        {
          type: 'email',
          direction: 'inbound',
          subject: 'Email 2',
          content: 'Content 2',
          candidateId: candidate.id,
          isRead: true,
        },
      ]);

      const statsResponse = await request(app.getHttpServer())
        .get(`/communication-history/candidate/${candidate.id}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statsResponse.body).toMatchObject({
        totalCommunications: 2,
        emailCount: 2,
        inboundCount: 1,
        outboundCount: 1,
      });
    });

    it('should mark communication as read', async () => {
      const candidate = await candidateRepository.save({
        email: 'candidate@example.com',
        firstName: 'John',
        lastName: 'Doe',
        consentGiven: true,
        totalExperience: 5,
      });

      const communication = await communicationHistoryRepository.save({
        type: 'email',
        direction: 'outbound',
        subject: 'Test Email',
        content: 'Test Content',
        candidateId: candidate.id,
        isRead: false,
      });

      const response = await request(app.getHttpServer())
        .patch(`/communication-history/${communication.id}/mark-read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.isRead).toBe(true);
      expect(response.body.readAt).toBeDefined();
    });
  });

  describe('Candidate Communication Preferences Workflow', () => {
    it('should create and manage communication preferences', async () => {
      const candidate = await candidateRepository.save({
        email: 'candidate@example.com',
        firstName: 'John',
        lastName: 'Doe',
        consentGiven: true,
        totalExperience: 5,
      });

      // Create preferences
      const createDto = {
        candidateId: candidate.id,
        emailEnabled: true,
        smsEnabled: false,
        applicationUpdatesFrequency: CommunicationFrequency.IMMEDIATE,
      };

      const response = await request(app.getHttpServer())
        .post('/candidate-communication-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        candidateId: candidate.id,
        emailEnabled: true,
        smsEnabled: false,
        applicationUpdatesFrequency: CommunicationFrequency.IMMEDIATE,
      });

      // Get preferences by candidate ID
      const preferencesResponse = await request(app.getHttpServer())
        .get(`/candidate-communication-preferences/candidate/${candidate.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(preferencesResponse.body.candidateId).toBe(candidate.id);
    });

    it('should handle opt-out and opt-in', async () => {
      const candidate = await candidateRepository.save({
        email: 'candidate@example.com',
        firstName: 'John',
        lastName: 'Doe',
        consentGiven: true,
        totalExperience: 5,
      });

      // Create default preferences
      await preferencesRepository.save({
        candidateId: candidate.id,
        emailEnabled: true,
        smsEnabled: false,
        phoneEnabled: true,
        applicationUpdatesFrequency: CommunicationFrequency.IMMEDIATE,
        marketingFrequency: CommunicationFrequency.WEEKLY,
        interviewRemindersFrequency: CommunicationFrequency.IMMEDIATE,
        optedOut: false,
      });

      // Opt out
      const optOutResponse = await request(app.getHttpServer())
        .post(
          `/candidate-communication-preferences/candidate/${candidate.id}/opt-out`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Too many emails' })
        .expect(201);

      expect(optOutResponse.body.optedOut).toBe(true);
      expect(optOutResponse.body.optOutReason).toBe('Too many emails');

      // Opt in
      const optInResponse = await request(app.getHttpServer())
        .post(
          `/candidate-communication-preferences/candidate/${candidate.id}/opt-in`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(optInResponse.body.optedOut).toBe(false);
      expect(optInResponse.body.optOutReason).toBeNull();
    });

    it('should check communication permissions', async () => {
      const candidate = await candidateRepository.save({
        email: 'candidate@example.com',
        firstName: 'John',
        lastName: 'Doe',
        consentGiven: true,
        totalExperience: 5,
      });

      await preferencesRepository.save({
        candidateId: candidate.id,
        emailEnabled: true,
        smsEnabled: false,
        phoneEnabled: true,
        applicationUpdatesFrequency: CommunicationFrequency.IMMEDIATE,
        marketingFrequency: CommunicationFrequency.WEEKLY,
        interviewRemindersFrequency: CommunicationFrequency.IMMEDIATE,
        optedOut: false,
      });

      // Check email permission (should be true)
      const emailResponse = await request(app.getHttpServer())
        .get(
          `/candidate-communication-preferences/candidate/${candidate.id}/can-send/email`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(emailResponse.body.canSend).toBe(true);

      // Check SMS permission (should be false)
      const smsResponse = await request(app.getHttpServer())
        .get(
          `/candidate-communication-preferences/candidate/${candidate.id}/can-send/sms`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(smsResponse.body.canSend).toBe(false);
    });
  });

  describe('Integration with Application Status Changes', () => {
    it('should handle complete workflow from application to communication', async () => {
      // Create candidate
      const candidate = await candidateRepository.save({
        email: 'candidate@example.com',
        firstName: 'John',
        lastName: 'Doe',
        consentGiven: true,
        totalExperience: 5,
      });

      // Create communication preferences
      await preferencesRepository.save({
        candidateId: candidate.id,
        emailEnabled: true,
        smsEnabled: false,
        phoneEnabled: true,
        applicationUpdatesFrequency: CommunicationFrequency.IMMEDIATE,
        marketingFrequency: CommunicationFrequency.WEEKLY,
        interviewRemindersFrequency: CommunicationFrequency.IMMEDIATE,
        optedOut: false,
      });

      // Create application
      const application = await applicationRepository.save({
        candidateId: candidate.id,
        companyJobVariantId: 'variant-1',
        status: PipelineStage.APPLIED,
        fitScore: 85,
        appliedAt: new Date(),
      });

      // Create email template
      await emailTemplateRepository.save({
        name: 'Application Received',
        type: EmailTemplateType.APPLICATION_RECEIVED,
        subject: 'Application Received - {{jobTitle}}',
        htmlContent:
          '<p>Hello {{candidateFirstName}}, we received your application.</p>',
        status: EmailTemplateStatus.ACTIVE,
      });

      // Verify that communication preferences exist and allow emails
      const preferencesResponse = await request(app.getHttpServer())
        .get(
          `/candidate-communication-preferences/candidate/${candidate.id}/can-send/email`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(preferencesResponse.body.canSend).toBe(true);

      // Verify communication history can be created
      const communicationDto = {
        type: 'email',
        direction: 'outbound',
        subject: 'Application Status Update',
        content: 'Your application status has been updated.',
        candidateId: candidate.id,
        applicationId: application.id,
      };

      const communicationResponse = await request(app.getHttpServer())
        .post('/communication-history')
        .set('Authorization', `Bearer ${authToken}`)
        .send(communicationDto)
        .expect(201);

      expect(communicationResponse.body).toMatchObject({
        candidateId: candidate.id,
        applicationId: application.id,
        subject: 'Application Status Update',
      });
    });
  });
});
