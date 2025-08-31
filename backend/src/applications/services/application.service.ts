import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Application, PipelineStage } from '../../entities/application.entity';
import { StageHistoryEntry } from '../../entities/stage-history-entry.entity';
import { Candidate } from '../../entities/candidate.entity';
import { CompanyJobVariant } from '../../entities/company-job-variant.entity';
import { MatchingService } from '../../matching/services/matching.service';
import { MatchExplanationService } from '../../matching/services/match-explanation.service';
import { CreateApplicationDto } from '../dto/create-application.dto';
import { UpdateApplicationDto } from '../dto/update-application.dto';
import { ApplicationResponseDto } from '../dto/application-response.dto';
import { StageTransitionDto } from '../dto/stage-transition.dto';
import { ApplicationFilterDto } from '../dto/application-filter.dto';

@Injectable()
export class ApplicationService {
  private readonly logger = new Logger(ApplicationService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(StageHistoryEntry)
    private readonly stageHistoryRepository: Repository<StageHistoryEntry>,
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
    @InjectRepository(CompanyJobVariant)
    private readonly jobVariantRepository: Repository<CompanyJobVariant>,
    private readonly matchingService: MatchingService,
    private readonly matchExplanationService: MatchExplanationService,
    @InjectQueue('matching') private readonly matchingQueue: Queue,
  ) {}

  async create(
    createApplicationDto: CreateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    // Check if application already exists for this candidate and job variant
    const existingApplication = await this.applicationRepository.findOne({
      where: {
        candidateId: createApplicationDto.candidateId,
        companyJobVariantId: createApplicationDto.companyJobVariantId,
      },
    });

    if (existingApplication) {
      throw new ConflictException(
        'Application already exists for this candidate and job variant',
      );
    }

    const application = this.applicationRepository.create({
      ...createApplicationDto,
      status: createApplicationDto.status || PipelineStage.APPLIED,
    });

    const savedApplication = await this.applicationRepository.save(application);

    // Create initial stage history entry
    await this.createStageHistoryEntry(
      savedApplication.id,
      null,
      savedApplication.status,
      'system', // TODO: Get actual user ID from context
      true, // automated
    );

    // Queue matching job for automatic fit score calculation
    await this.queueMatchingJob(savedApplication.id);

    return this.toResponseDto(savedApplication);
  }

  async findAll(
    filterDto?: ApplicationFilterDto,
    options?: FindManyOptions<Application>,
  ): Promise<ApplicationResponseDto[]> {
    const queryBuilder = this.applicationRepository.createQueryBuilder('app');

    // Apply filters
    if (filterDto?.status) {
      queryBuilder.andWhere('app.status = :status', {
        status: filterDto.status,
      });
    }

    if (filterDto?.candidateId) {
      queryBuilder.andWhere('app.candidateId = :candidateId', {
        candidateId: filterDto.candidateId,
      });
    }

    if (filterDto?.companyJobVariantId) {
      queryBuilder.andWhere('app.companyJobVariantId = :companyJobVariantId', {
        companyJobVariantId: filterDto.companyJobVariantId,
      });
    }

    if (filterDto?.minFitScore !== undefined) {
      queryBuilder.andWhere('app.fitScore >= :minFitScore', {
        minFitScore: filterDto.minFitScore,
      });
    }

    if (filterDto?.maxFitScore !== undefined) {
      queryBuilder.andWhere('app.fitScore <= :maxFitScore', {
        maxFitScore: filterDto.maxFitScore,
      });
    }

    // Add relations
    queryBuilder.leftJoinAndSelect('app.candidate', 'candidate');
    queryBuilder.leftJoinAndSelect(
      'app.companyJobVariant',
      'companyJobVariant',
    );
    queryBuilder.leftJoinAndSelect('app.matchExplanation', 'matchExplanation');
    queryBuilder.leftJoinAndSelect('app.notes', 'notes');
    queryBuilder.leftJoinAndSelect('app.stageHistory', 'stageHistory');

    // Apply additional options
    if (options?.order) {
      Object.entries(options.order).forEach(([field, direction]) => {
        queryBuilder.addOrderBy(`app.${field}`, direction as 'ASC' | 'DESC');
      });
    } else {
      queryBuilder.orderBy('app.lastUpdated', 'DESC');
    }

    if (options?.skip) {
      queryBuilder.skip(options.skip);
    }

    if (options?.take) {
      queryBuilder.take(options.take);
    }

    const applications = await queryBuilder.getMany();
    return applications.map((app) => this.toResponseDto(app));
  }

  async findOne(id: string): Promise<ApplicationResponseDto> {
    const application = await this.applicationRepository.findOne({
      where: { id },
      relations: [
        'candidate',
        'companyJobVariant',
        'matchExplanation',
        'notes',
        'stageHistory',
      ],
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    return this.toResponseDto(application);
  }

  async findByCandidate(
    candidateId: string,
  ): Promise<ApplicationResponseDto[]> {
    const applications = await this.applicationRepository.find({
      where: { candidateId },
      relations: [
        'candidate',
        'companyJobVariant',
        'matchExplanation',
        'notes',
        'stageHistory',
      ],
      order: { appliedAt: 'DESC' },
    });

    return applications.map((app) => this.toResponseDto(app));
  }

  async findByJobVariant(
    companyJobVariantId: string,
  ): Promise<ApplicationResponseDto[]> {
    const applications = await this.applicationRepository.find({
      where: { companyJobVariantId },
      relations: [
        'candidate',
        'companyJobVariant',
        'matchExplanation',
        'notes',
        'stageHistory',
      ],
      order: { fitScore: 'DESC' },
    });

    return applications.map((app) => this.toResponseDto(app));
  }

  async update(
    id: string,
    updateApplicationDto: UpdateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationRepository.findOne({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    Object.assign(application, updateApplicationDto);
    const updatedApplication =
      await this.applicationRepository.save(application);

    return this.toResponseDto(updatedApplication);
  }

  async transitionStage(
    id: string,
    stageTransitionDto: StageTransitionDto,
    userId: string,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationRepository.findOne({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    // Validate stage transition
    this.validateStageTransition(
      application.status,
      stageTransitionDto.toStage,
    );

    const previousStage = application.status;
    application.status = stageTransitionDto.toStage;

    const updatedApplication =
      await this.applicationRepository.save(application);

    // Create stage history entry
    await this.createStageHistoryEntry(
      id,
      previousStage,
      stageTransitionDto.toStage,
      userId,
      false,
      stageTransitionDto.notes,
    );

    return this.toResponseDto(updatedApplication);
  }

  async remove(id: string): Promise<void> {
    const result = await this.applicationRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }
  }

  async getApplicationsByStage(
    stage: PipelineStage,
  ): Promise<ApplicationResponseDto[]> {
    const applications = await this.applicationRepository.find({
      where: { status: stage },
      relations: [
        'candidate',
        'companyJobVariant',
        'matchExplanation',
        'notes',
        'stageHistory',
      ],
      order: { lastUpdated: 'DESC' },
    });

    return applications.map((app) => this.toResponseDto(app));
  }

  async updateFitScore(
    id: string,
    fitScore: number,
  ): Promise<ApplicationResponseDto> {
    if (fitScore < 0 || fitScore > 100) {
      throw new BadRequestException('Fit score must be between 0 and 100');
    }

    const application = await this.applicationRepository.findOne({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    application.fitScore = fitScore;
    const updatedApplication =
      await this.applicationRepository.save(application);

    return this.toResponseDto(updatedApplication);
  }

  private validateStageTransition(
    currentStage: PipelineStage,
    newStage: PipelineStage,
  ): void {
    // Define valid transitions
    const validTransitions: Record<PipelineStage, PipelineStage[]> = {
      [PipelineStage.APPLIED]: [
        PipelineStage.SCREENING,
        PipelineStage.REJECTED,
      ],
      [PipelineStage.SCREENING]: [
        PipelineStage.SHORTLISTED,
        PipelineStage.REJECTED,
      ],
      [PipelineStage.SHORTLISTED]: [
        PipelineStage.INTERVIEW_SCHEDULED,
        PipelineStage.REJECTED,
      ],
      [PipelineStage.INTERVIEW_SCHEDULED]: [
        PipelineStage.INTERVIEW_COMPLETED,
        PipelineStage.REJECTED,
      ],
      [PipelineStage.INTERVIEW_COMPLETED]: [
        PipelineStage.OFFER_EXTENDED,
        PipelineStage.REJECTED,
      ],
      [PipelineStage.OFFER_EXTENDED]: [
        PipelineStage.OFFER_ACCEPTED,
        PipelineStage.REJECTED,
      ],
      [PipelineStage.OFFER_ACCEPTED]: [PipelineStage.HIRED],
      [PipelineStage.HIRED]: [],
      [PipelineStage.REJECTED]: [],
    };

    const allowedTransitions = validTransitions[currentStage];
    if (!allowedTransitions.includes(newStage)) {
      throw new BadRequestException(
        `Invalid stage transition from ${currentStage} to ${newStage}`,
      );
    }
  }

  private async createStageHistoryEntry(
    applicationId: string,
    fromStage: PipelineStage | null,
    toStage: PipelineStage,
    userId: string,
    automated: boolean,
    notes?: string,
  ): Promise<StageHistoryEntry> {
    const stageHistoryEntry = this.stageHistoryRepository.create({
      applicationId,
      fromStage,
      toStage,
      changedById: userId,
      automated,
      notes,
    });

    return this.stageHistoryRepository.save(stageHistoryEntry);
  }

  /**
   * Calculate and update fit score for an application
   */
  async calculateAndUpdateFitScore(applicationId: string): Promise<void> {
    try {
      this.logger.log(`Calculating fit score for application ${applicationId}`);

      const application = await this.applicationRepository.findOne({
        where: { id: applicationId },
        relations: ['candidate', 'companyJobVariant'],
      });

      if (!application) {
        throw new NotFoundException(`Application ${applicationId} not found`);
      }

      // Get candidate with parsed data
      const candidate = await this.candidateRepository.findOne({
        where: { id: application.candidateId },
        relations: ['parsedData'],
      });

      if (!candidate) {
        throw new NotFoundException(
          `Candidate ${application.candidateId} not found`,
        );
      }

      // Get job variant with requirements
      const jobVariant = await this.jobVariantRepository.findOne({
        where: { id: application.companyJobVariantId },
        relations: [
          'requirements',
          'jobTemplate',
          'jobTemplate.requirements',
          'companyProfile',
        ],
      });

      if (!jobVariant) {
        throw new NotFoundException(
          `Job variant ${application.companyJobVariantId} not found`,
        );
      }

      // Calculate match result
      const matchResult = await this.matchingService.matchCandidateToJob(
        candidate.id,
        jobVariant.id,
        { includeExplanation: true },
      );

      // Update application with fit score
      application.fitScore = matchResult.fitScore;
      await this.applicationRepository.save(application);

      // Generate and store match explanation
      await this.matchExplanationService.generateMatchExplanation(
        applicationId,
        matchResult,
        candidate,
        jobVariant,
        { includeDetailedAnalysis: true, includeRecommendations: true },
      );

      this.logger.log(
        `Successfully calculated fit score ${matchResult.fitScore}% for application ${applicationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error calculating fit score for application ${applicationId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Queue matching job for background processing
   */
  private async queueMatchingJob(applicationId: string): Promise<void> {
    try {
      await this.matchingQueue.add(
        'calculate-fit-score',
        { applicationId },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );

      this.logger.log(`Queued matching job for application ${applicationId}`);
    } catch (error) {
      this.logger.error(
        `Error queuing matching job for application ${applicationId}: ${error.message}`,
      );
      // Don't throw error here to avoid blocking application creation
    }
  }

  /**
   * Batch calculate fit scores for existing candidates against a job variant
   */
  async batchCalculateFitScores(
    jobVariantId: string,
    candidateIds?: string[],
  ): Promise<void> {
    try {
      this.logger.log(
        `Starting batch fit score calculation for job variant ${jobVariantId}`,
      );

      // Get all applications for this job variant
      const queryBuilder = this.applicationRepository
        .createQueryBuilder('app')
        .where('app.companyJobVariantId = :jobVariantId', { jobVariantId });

      if (candidateIds && candidateIds.length > 0) {
        queryBuilder.andWhere('app.candidateId IN (:...candidateIds)', {
          candidateIds,
        });
      }

      const applications = await queryBuilder.getMany();

      // Queue matching jobs for each application
      for (const application of applications) {
        await this.matchingQueue.add(
          'calculate-fit-score',
          { applicationId: application.id },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: 10,
            removeOnFail: 5,
            delay: Math.random() * 5000, // Spread out jobs to avoid rate limiting
          },
        );
      }

      this.logger.log(
        `Queued ${applications.length} matching jobs for batch processing`,
      );
    } catch (error) {
      this.logger.error(
        `Error in batch fit score calculation: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Recalculate fit score for an application (manual trigger)
   */
  async recalculateFitScore(
    applicationId: string,
  ): Promise<ApplicationResponseDto> {
    await this.calculateAndUpdateFitScore(applicationId);
    return this.findOne(applicationId);
  }

  private toResponseDto(application: Application): ApplicationResponseDto {
    return {
      id: application.id,
      candidateId: application.candidateId,
      companyJobVariantId: application.companyJobVariantId,
      status: application.status,
      fitScore: application.fitScore,
      appliedAt: application.appliedAt,
      lastUpdated: application.lastUpdated,
      candidate: application.candidate,
      companyJobVariant: application.companyJobVariant,
      matchExplanation: application.matchExplanation,
      notes: application.notes,
      stageHistory: application.stageHistory,
    };
  }
}
