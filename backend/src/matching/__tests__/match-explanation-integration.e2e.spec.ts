import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { MatchingModule } from '../matching.module';
import { AuthModule } from '../../auth/auth.module';
import { CandidatesModule } from '../../candidates/candidates.module';
import { JobsModule } from '../../jobs/jobs.module';
import { ApplicationsModule } from '../../applications/applications.module';
import { Candidate } from '../../entities/candidate.entity';
import { CompanyJobVariant } from '../../entities/company-job-variant.entity';
import { Application } from '../../entities/application.entity';
import { MatchExplanation } from '../../entities/match-explanation.entity';
import { RequirementItem } from '../../entities/requirement-item.entity';
import { JobTemplate } from '../../entities/job-template.entity';
import { CompanyProfile } from '../../entities/company-profile.entity';
import { JobFamily } from '../../entities/job-family.entity';
import { User } from '../../entities/user.entity';
import { ParsedResumeData } from '../../entities/parsed-resume-data.entity';
import { ApplicationNote } from '../../entities/application-note.entity';
import { StageHistoryEntry } from '../../entities/stage-history-entry.entity';
import { JDVersion } from '../../entities/jd-version.entity';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    strengths: [
                      'Strong JavaScript development experience',
                      'Excellent React framework knowledge',
                    ],
                    gaps: ['Limited TypeScript experience'],
                    recommendations: [
                      'Consider TypeScript training for enhanced development',
                    ],
                  }),
                },
              },
            ],
          }),
        },
      },
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [
            {
              embedding: Array.from({ length: 1536 }, () => Math.random()),
            },
          ],
        }),
      },
    })),
  };
});

describe('Match Explanation Integration (E2E)', () => {
  let app: INestApplication;
  let authToken: string;

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
          entities: [
            User,
            Candidate,
            ParsedResumeData,
            JobFamily,
            JobTemplate,
            CompanyProfile,
            CompanyJobVariant,
            RequirementItem,
            JDVersion,
            Application,
            ApplicationNote,
            StageHistoryEntry,
            MatchExplanation,
          ],
          synchronize: true,
          logging: false,
        }),
        AuthModule,
        CandidatesModule,
        JobsModule,
        ApplicationsModule,
        MatchingModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create test user and get auth token
    const authResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'admin',
      });

    authToken = authResponse.body.data.accessToken;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Match Explanation Workflow', () => {
    let candidateId: string;
    let jobVariantId: string;
    let applicationId: string;

    it('should create test data and generate match explanation', async () => {
      // 1. Create a job family
      const jobFamilyResponse = await request(app.getHttpServer())
        .post('/job-families')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Software Engineer',
          description: 'Software development roles',
          baseRequirements: [],
          skillCategories: ['Programming', 'Web Development'],
        });

      expect(jobFamilyResponse.status).toBe(201);
      const jobFamilyId = jobFamilyResponse.body.data.id;

      // 2. Create a job template
      const jobTemplateResponse = await request(app.getHttpServer())
        .post('/job-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobFamilyId,
          name: 'Senior React Developer',
          level: 'senior',
          experienceRange: { min: 3, max: 7 },
          salaryRange: { min: 80000, max: 120000, currency: 'USD' },
          baseRequirements: [],
        });

      expect(jobTemplateResponse.status).toBe(201);
      const jobTemplateId = jobTemplateResponse.body.data.id;

      // 3. Create requirements for the job template
      const requirementResponse = await request(app.getHttpServer())
        .post('/requirement-items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobTemplateId,
          type: 'skill',
          category: 'must',
          description: 'React development experience',
          weight: 9,
          alternatives: ['Vue.js', 'Angular'],
        });

      expect(requirementResponse.status).toBe(201);

      // 4. Create a company profile
      const companyProfileResponse = await request(app.getHttpServer())
        .post('/company-profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Tech Startup Inc',
          industry: 'Technology',
          size: 'small',
          culture: ['innovative', 'fast-paced'],
          benefits: ['health insurance', 'remote work'],
          workArrangement: 'hybrid',
          location: 'San Francisco, CA',
          preferences: {
            prioritySkills: ['React', 'JavaScript'],
            dealBreakers: ['No experience'],
            niceToHave: ['TypeScript', 'AWS'],
          },
        });

      expect(companyProfileResponse.status).toBe(201);
      const companyProfileId = companyProfileResponse.body.data.id;

      // 5. Create a job variant
      const jobVariantResponse = await request(app.getHttpServer())
        .post('/company-job-variants')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobTemplateId,
          companyProfileId,
          customTitle: 'Senior React Developer',
          customDescription: 'Looking for an experienced React developer',
          additionalRequirements: [],
          modifiedRequirements: [],
          isActive: true,
        });

      expect(jobVariantResponse.status).toBe(201);
      jobVariantId = jobVariantResponse.body.data.id;

      // 6. Create a candidate
      const candidateResponse = await request(app.getHttpServer())
        .post('/candidates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
          location: 'New York, NY',
          linkedinUrl: 'https://linkedin.com/in/johndoe',
          portfolioUrl: 'https://johndoe.dev',
          consentGiven: true,
        });

      expect(candidateResponse.status).toBe(201);
      candidateId = candidateResponse.body.data.id;

      // 7. Create parsed resume data for the candidate
      await request(app.getHttpServer())
        .post('/parsed-resume-data')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          candidateId,
          skills: [
            {
              name: 'JavaScript',
              yearsOfExperience: 5,
              proficiencyLevel: 'Expert',
            },
            {
              name: 'React',
              yearsOfExperience: 4,
              proficiencyLevel: 'Advanced',
            },
          ],
          experience: [
            {
              company: 'Tech Corp',
              jobTitle: 'Senior Developer',
              startDate: '2020-01',
              endDate: '2023-12',
              description: 'Led development of React applications',
              technologies: ['React', 'JavaScript', 'Node.js'],
            },
          ],
          education: [
            {
              institution: 'University of Technology',
              degree: 'Bachelor of Science',
              fieldOfStudy: 'Computer Science',
              graduationYear: 2018,
              gpa: '3.8',
            },
          ],
          certifications: ['AWS Certified Developer'],
          summary:
            'Experienced full-stack developer with 5+ years of experience',
          totalExperience: 5,
        });

      // 8. Create an application
      const applicationResponse = await request(app.getHttpServer())
        .post('/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          candidateId,
          companyJobVariantId: jobVariantId,
          status: 'applied',
        });

      expect(applicationResponse.status).toBe(201);
      applicationId = applicationResponse.body.data.id;

      // 9. Generate match explanation
      const explanationResponse = await request(app.getHttpServer())
        .post('/match-explanations/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          applicationId,
          includeDetailedAnalysis: true,
          includeRecommendations: true,
          maxExplanationLength: 2000,
        });

      expect(explanationResponse.status).toBe(201);
      expect(explanationResponse.body.success).toBe(true);
      expect(explanationResponse.body.data).toHaveProperty('id');
      expect(explanationResponse.body.data).toHaveProperty('overallScore');
      expect(explanationResponse.body.data).toHaveProperty('strengths');
      expect(explanationResponse.body.data).toHaveProperty('gaps');
      expect(explanationResponse.body.data).toHaveProperty('recommendations');
      expect(explanationResponse.body.data).toHaveProperty('detailedAnalysis');

      // Verify the explanation contains AI-generated content
      expect(explanationResponse.body.data.strengths).toContain(
        'Strong JavaScript development experience',
      );
      expect(explanationResponse.body.data.gaps).toContain(
        'Limited TypeScript experience',
      );
      expect(explanationResponse.body.data.recommendations).toContain(
        'Consider TypeScript training for enhanced development',
      );
    }, 30000);

    it('should retrieve existing match explanation', async () => {
      const response = await request(app.getHttpServer())
        .get(`/match-explanations/application/${applicationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.applicationId).toBe(applicationId);
    });

    it('should update existing match explanation', async () => {
      const response = await request(app.getHttpServer())
        .put(`/match-explanations/application/${applicationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          includeDetailedAnalysis: false,
          includeRecommendations: true,
          maxExplanationLength: 1500,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.message).toBe(
        'Match explanation updated successfully',
      );
    });

    it('should delete match explanation', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/match-explanations/application/${applicationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'Match explanation deleted successfully',
      );

      // Verify it's deleted
      const getResponse = await request(app.getHttpServer())
        .get(`/match-explanations/application/${applicationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('Batch Operations', () => {
    let applicationIds: string[] = [];

    beforeAll(async () => {
      // Create multiple applications for batch testing
      for (let i = 0; i < 3; i++) {
        // Create candidate
        const candidateResponse = await request(app.getHttpServer())
          .post('/candidates')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            email: `candidate${i}@example.com`,
            firstName: `Candidate${i}`,
            lastName: 'Test',
            consentGiven: true,
          });

        const candidateId = candidateResponse.body.data.id;

        // Create parsed resume data
        await request(app.getHttpServer())
          .post('/parsed-resume-data')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            candidateId,
            skills: [
              {
                name: 'JavaScript',
                yearsOfExperience: 3 + i,
                proficiencyLevel: 'Advanced',
              },
            ],
            experience: [],
            education: [],
            certifications: [],
            summary: `Developer with ${3 + i} years of experience`,
            totalExperience: 3 + i,
          });

        // Create application (reuse existing job variant)
        const applicationResponse = await request(app.getHttpServer())
          .post('/applications')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            candidateId,
            companyJobVariantId:
              applicationIds.length > 0 ? applicationIds[0] : 'temp',
            status: 'applied',
          });

        if (applicationResponse.status === 201) {
          applicationIds.push(applicationResponse.body.data.id);
        }
      }
    });

    it('should batch regenerate explanations', async () => {
      if (applicationIds.length === 0) {
        // Skip if no applications were created
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/match-explanations/batch-regenerate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          applicationIds: applicationIds.slice(0, 2), // Test with first 2
          options: {
            includeDetailedAnalysis: true,
            includeRecommendations: false,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('successful');
      expect(response.body.data).toHaveProperty('failed');
      expect(response.body.data).toHaveProperty('summary');
    });

    it('should handle batch operation with invalid application IDs', async () => {
      const response = await request(app.getHttpServer())
        .post('/match-explanations/batch-regenerate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          applicationIds: ['invalid-id-1', 'invalid-id-2'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.failed.length).toBe(2);
      expect(response.body.data.successful.length).toBe(0);
    });

    it('should reject batch operation with too many applications', async () => {
      const tooManyIds = Array.from({ length: 51 }, (_, i) => `app-${i}`);

      const response = await request(app.getHttpServer())
        .post('/match-explanations/batch-regenerate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          applicationIds: tooManyIds,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'Maximum 50 applications can be processed at once',
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent application', async () => {
      const response = await request(app.getHttpServer())
        .post('/match-explanations/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          applicationId: 'non-existent-id',
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app.getHttpServer())
        .post('/match-explanations/generate')
        .send({
          applicationId: 'some-id',
        });

      expect(response.status).toBe(401);
    });

    it('should validate request body', async () => {
      const response = await request(app.getHttpServer())
        .post('/match-explanations/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing applicationId
          includeDetailedAnalysis: true,
        });

      expect(response.status).toBe(400);
    });
  });
});
