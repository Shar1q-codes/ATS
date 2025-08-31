import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule, getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { ApplicationService } from '../services/application.service';
import { MatchingService } from '../../matching/services/matching.service';
import { MatchExplanationService } from '../../matching/services/match-explanation.service';
import { MatchingProcessor } from '../processors/matching.processor';
import { Application, PipelineStage } from '../../entities/application.entity';
import { Candidate } from '../../entities/candidate.entity';
import { CompanyJobVariant } from '../../entities/company-job-variant.entity';
import { MatchExplanation } from '../../entities/match-explanation.entity';
import { StageHistoryEntry } from '../../entities/stage-history-entry.entity';
import { ApplicationNote } from '../../entities/application-note.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('Matching Integration (e2e)', () => {
  let app: INestApplication;
  let applicationService: ApplicationService;
  let matchingService: MatchingService;
  let matchExplanationService: MatchExplanationService;
  let matchingProcessor: MatchingProcessor;
  let matchingQueue: Queue;
  let applicationRepository: Repository<Application>;
  let candidateRepository: Repository<Candidate>;
  let jobVariantRepository: Repository<CompanyJobVariant>;
  let matchExplanationRepository: Repository<MatchExplanation>;

  const mockCandidate = {
    id: 'candidate-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    parsedData: {
      skills: [
        { name: 'JavaScript', yearsOfExperience: 5 },
        { name: 'React', yearsOfExperience: 3 },
        { name: 'Node.js', yearsOfExperience: 4 },
      ],
      experience: [
        {
          jobTitle: 'Senior Developer',
          company: 'Tech Corp',
          description: 'Full-stack development with React and Node.js',
        },
      ],
      education: [
        {
          degree: 'Bachelor of Science',
          fieldOfStudy: 'Computer Science',
        },
      ],
      totalExperience: 5,
      summary: 'Experienced full-stack developer',
    },
  };

  const mockJobVariant = {
    id: 'job-variant-1',
    customTitle: 'Senior Full Stack Developer',
    customDescription: 'Looking for an experienced full-stack developer',
    jobTemplate: {
      id: 'template-1',
      name: 'Full Stack Developer',
    },
    companyProfile: {
      id: 'company-1',
      name: 'Tech Company',
      industry: 'Technology',
    },
  };

  const mockMatchResult = {
    candidateId: 'candidate-1',
    jobVariantId: 'job-variant-1',
    fitScore: 85,
    breakdown: {
      mustHaveScore: 90,
      shouldHaveScore: 80,
      niceToHaveScore: 75,
    },
    strengths: ['Strong JavaScript skills', 'React experience'],
    gaps: ['Missing Python experience'],
    recommendations: ['Consider Python training'],
    detailedAnalysis: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            Application,
            Candidate,
            CompanyJobVariant,
            MatchExplanation,
            StageHistoryEntry,
            ApplicationNote,
          ],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([
          Application,
          Candidate,
          CompanyJobVariant,
          MatchExplanation,
          StageHistoryEntry,
          ApplicationNote,
        ]),
        BullModule.registerQueue({
          name: 'matching',
        }),
      ],
      providers: [
        ApplicationService,
        MatchingProcessor,
        {
          provide: MatchingService,
          useValue: {
            matchCandidateToJob: jest.fn().mockResolvedValue(mockMatchResult),
          },
        },
        {
          provide: MatchExplanationService,
          useValue: {
            generateMatchExplanation: jest.fn().mockResolvedValue({
              id: 'explanation-1',
              applicationId: 'app-1',
              overallScore: 85,
              strengths: mockMatchResult.strengths,
              gaps: mockMatchResult.gaps,
              recommendations: mockMatchResult.recommendations,
            }),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    applicationService = module.get<ApplicationService>(ApplicationService);
    matchingService = module.get<MatchingService>(MatchingService);
    matchExplanationService = module.get<MatchExplanationService>(
      MatchExplanationService,
    );
    matchingProcessor = module.get<MatchingProcessor>(MatchingProcessor);
    matchingQueue = module.get<Queue>(getQueueToken('matching'));

    applicationRepository = module.get<Repository<Application>>(
      getRepositoryToken(Application),
    );
    candidateRepository = module.get<Repository<Candidate>>(
      getRepositoryToken(Candidate),
    );
    jobVariantRepository = module.get<Repository<CompanyJobVariant>>(
      getRepositoryToken(CompanyJobVariant),
    );
    matchExplanationRepository = module.get<Repository<MatchExplanation>>(
      getRepositoryToken(MatchExplanation),
    );

    // Setup test data
    await candidateRepository.save(mockCandidate);
    await jobVariantRepository.save(mockJobVariant);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Application Creation with Automatic Matching', () => {
    it('should queue matching job when creating application', async () => {
      const queueAddSpy = jest
        .spyOn(matchingQueue, 'add')
        .mockResolvedValue({} as any);

      const createApplicationDto = {
        candidateId: 'candidate-1',
        companyJobVariantId: 'job-variant-1',
      };

      const result = await applicationService.create(createApplicationDto);

      expect(result).toBeDefined();
      expect(result.candidateId).toBe('candidate-1');
      expect(result.companyJobVariantId).toBe('job-variant-1');
      expect(result.status).toBe(PipelineStage.APPLIED);

      expect(queueAddSpy).toHaveBeenCalledWith(
        'calculate-fit-score',
        { applicationId: result.id },
        expect.objectContaining({
          attempts: 3,
          backoff: expect.any(Object),
        }),
      );
    });

    it('should not fail application creation if queue fails', async () => {
      jest
        .spyOn(matchingQueue, 'add')
        .mockRejectedValue(new Error('Queue error'));

      const createApplicationDto = {
        candidateId: 'candidate-1',
        companyJobVariantId: 'job-variant-1',
      };

      const result = await applicationService.create(createApplicationDto);

      expect(result).toBeDefined();
      expect(result.candidateId).toBe('candidate-1');
      expect(result.companyJobVariantId).toBe('job-variant-1');
    });
  });

  describe('Fit Score Calculation', () => {
    let application: Application;

    beforeEach(async () => {
      application = await applicationRepository.save({
        candidateId: 'candidate-1',
        companyJobVariantId: 'job-variant-1',
        status: PipelineStage.APPLIED,
      });
    });

    it('should calculate and update fit score', async () => {
      await applicationService.calculateAndUpdateFitScore(application.id);

      const updatedApplication = await applicationRepository.findOne({
        where: { id: application.id },
      });

      expect(updatedApplication.fitScore).toBe(85);
      expect(matchingService.matchCandidateToJob).toHaveBeenCalledWith(
        'candidate-1',
        'job-variant-1',
        { includeExplanation: true },
      );
      expect(
        matchExplanationService.generateMatchExplanation,
      ).toHaveBeenCalled();
    });

    it('should handle missing application', async () => {
      await expect(
        applicationService.calculateAndUpdateFitScore('non-existent-id'),
      ).rejects.toThrow('Application non-existent-id not found');
    });

    it('should handle missing candidate', async () => {
      await candidateRepository.delete('candidate-1');

      await expect(
        applicationService.calculateAndUpdateFitScore(application.id),
      ).rejects.toThrow('Candidate candidate-1 not found');
    });

    it('should handle missing job variant', async () => {
      await jobVariantRepository.delete('job-variant-1');

      await expect(
        applicationService.calculateAndUpdateFitScore(application.id),
      ).rejects.toThrow('Job variant job-variant-1 not found');
    });
  });

  describe('Batch Fit Score Calculation', () => {
    let applications: Application[];

    beforeEach(async () => {
      applications = await applicationRepository.save([
        {
          candidateId: 'candidate-1',
          companyJobVariantId: 'job-variant-1',
          status: PipelineStage.APPLIED,
        },
        {
          candidateId: 'candidate-1',
          companyJobVariantId: 'job-variant-1',
          status: PipelineStage.SCREENING,
        },
      ]);
    });

    it('should queue jobs for all applications of a job variant', async () => {
      const queueAddSpy = jest
        .spyOn(matchingQueue, 'add')
        .mockResolvedValue({} as any);

      await applicationService.batchCalculateFitScores('job-variant-1');

      expect(queueAddSpy).toHaveBeenCalledTimes(applications.length);
      applications.forEach((app) => {
        expect(queueAddSpy).toHaveBeenCalledWith(
          'calculate-fit-score',
          { applicationId: app.id },
          expect.objectContaining({
            attempts: 3,
            delay: expect.any(Number),
          }),
        );
      });
    });

    it('should queue jobs for specific candidates only', async () => {
      const queueAddSpy = jest
        .spyOn(matchingQueue, 'add')
        .mockResolvedValue({} as any);

      await applicationService.batchCalculateFitScores('job-variant-1', [
        'candidate-1',
      ]);

      expect(queueAddSpy).toHaveBeenCalledTimes(applications.length);
    });
  });

  describe('Recalculate Fit Score', () => {
    let application: Application;

    beforeEach(async () => {
      application = await applicationRepository.save({
        candidateId: 'candidate-1',
        companyJobVariantId: 'job-variant-1',
        status: PipelineStage.APPLIED,
        fitScore: 50, // Old score
      });
    });

    it('should recalculate and return updated application', async () => {
      const result = await applicationService.recalculateFitScore(
        application.id,
      );

      expect(result.fitScore).toBe(85);
      expect(matchingService.matchCandidateToJob).toHaveBeenCalled();
    });
  });

  describe('Matching Processor', () => {
    let application: Application;

    beforeEach(async () => {
      application = await applicationRepository.save({
        candidateId: 'candidate-1',
        companyJobVariantId: 'job-variant-1',
        status: PipelineStage.APPLIED,
      });
    });

    it('should process fit score calculation job', async () => {
      const job = {
        data: { applicationId: application.id },
      } as any;

      await matchingProcessor.handleFitScoreCalculation(job);

      const updatedApplication = await applicationRepository.findOne({
        where: { id: application.id },
      });

      expect(updatedApplication.fitScore).toBe(85);
    });

    it('should throw error for invalid application ID', async () => {
      const job = {
        data: { applicationId: 'invalid-id' },
      } as any;

      await expect(
        matchingProcessor.handleFitScoreCalculation(job),
      ).rejects.toThrow();
    });
  });
});
