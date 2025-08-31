import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Candidate } from '../../entities/candidate.entity';
import { CreateCandidateDto } from '../dto/create-candidate.dto';
import { UpdateCandidateDto } from '../dto/update-candidate.dto';
import { CandidateResponseDto } from '../dto/candidate-response.dto';
import { CacheService } from '../../common/performance/cache.service';
import {
  PaginationService,
  PaginationOptions,
  PaginationResult,
} from '../../common/performance/pagination.service';

@Injectable()
export class CandidateService {
  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
    private readonly cacheService: CacheService,
    private readonly paginationService: PaginationService,
  ) {}

  async create(
    createCandidateDto: CreateCandidateDto,
  ): Promise<CandidateResponseDto> {
    // Check if candidate with email already exists
    const existingCandidate = await this.candidateRepository.findOne({
      where: { email: createCandidateDto.email },
    });

    if (existingCandidate) {
      throw new ConflictException(
        `Candidate with email ${createCandidateDto.email} already exists`,
      );
    }

    // Set consent date if consent is given
    const candidateData = {
      ...createCandidateDto,
      consentDate: createCandidateDto.consentGiven ? new Date() : null,
    };

    const candidate = this.candidateRepository.create(candidateData);
    const savedCandidate = await this.candidateRepository.save(candidate);

    // Invalidate relevant caches
    await this.invalidateCandidateCaches();

    return this.toResponseDto(savedCandidate);
  }

  async findAll(
    options: PaginationOptions = {},
  ): Promise<PaginationResult<CandidateResponseDto>> {
    const cacheKey = `candidates:all:${JSON.stringify(options)}`;

    // Try to get from cache first
    const cached = await this.cacheService.get<
      PaginationResult<CandidateResponseDto>
    >(
      cacheKey,
      { prefix: 'candidates', ttl: 300 }, // 5 minutes cache
    );

    if (cached) {
      return cached;
    }

    const queryBuilder = this.candidateRepository
      .createQueryBuilder('candidate')
      .leftJoinAndSelect('candidate.parsedData', 'parsedData')
      .leftJoinAndSelect('candidate.applications', 'applications');

    const result = await this.paginationService.paginate(queryBuilder, {
      ...options,
      sortBy: options.sortBy || 'candidate.createdAt',
      sortOrder: options.sortOrder || 'DESC',
      searchFields: options.searchFields || [
        'candidate.firstName',
        'candidate.lastName',
        'candidate.email',
      ],
    });

    const responseResult = {
      ...result,
      data: result.data.map((candidate) => this.toResponseDto(candidate)),
    };

    // Cache the result
    await this.cacheService.set(cacheKey, responseResult, {
      prefix: 'candidates',
      ttl: 300,
    });

    return responseResult;
  }

  async findOne(id: string): Promise<CandidateResponseDto> {
    const cacheKey = `candidate:${id}`;

    // Try to get from cache first
    const cached = await this.cacheService.get<CandidateResponseDto>(
      cacheKey,
      { prefix: 'candidates', ttl: 600 }, // 10 minutes cache
    );

    if (cached) {
      return cached;
    }

    const candidate = await this.candidateRepository.findOne({
      where: { id },
      relations: ['parsedData', 'applications'],
      cache: 30000, // 30 seconds query cache
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    const responseDto = this.toResponseDto(candidate);

    // Cache the result
    await this.cacheService.set(cacheKey, responseDto, {
      prefix: 'candidates',
      ttl: 600,
    });

    return responseDto;
  }

  async findByEmail(email: string): Promise<CandidateResponseDto | null> {
    const candidate = await this.candidateRepository.findOne({
      where: { email },
      relations: ['parsedData', 'applications'],
    });

    return candidate ? this.toResponseDto(candidate) : null;
  }

  async update(
    id: string,
    updateCandidateDto: UpdateCandidateDto,
  ): Promise<CandidateResponseDto> {
    const candidate = await this.candidateRepository.findOne({ where: { id } });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    // Check if email is being updated and if it conflicts with existing candidate
    if (
      updateCandidateDto.email &&
      updateCandidateDto.email !== candidate.email
    ) {
      const existingCandidate = await this.candidateRepository.findOne({
        where: { email: updateCandidateDto.email },
      });

      if (existingCandidate) {
        throw new ConflictException(
          `Candidate with email ${updateCandidateDto.email} already exists`,
        );
      }
    }

    // Update consent date if consent is being granted for the first time
    if (updateCandidateDto.consentGiven && !candidate.consentGiven) {
      updateCandidateDto = {
        ...updateCandidateDto,
        consentDate: new Date(),
      } as UpdateCandidateDto & { consentDate: Date };
    }

    Object.assign(candidate, updateCandidateDto);
    const updatedCandidate = await this.candidateRepository.save(candidate);

    // Invalidate caches for this candidate
    await this.invalidateCandidateCache(id);
    await this.invalidateCandidateCaches();

    return this.toResponseDto(updatedCandidate);
  }

  async updateConsent(
    id: string,
    consentGiven: boolean,
  ): Promise<CandidateResponseDto> {
    const candidate = await this.candidateRepository.findOne({ where: { id } });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    candidate.consentGiven = consentGiven;
    candidate.consentDate = consentGiven ? new Date() : null;

    const updatedCandidate = await this.candidateRepository.save(candidate);
    return this.toResponseDto(updatedCandidate);
  }

  async remove(id: string): Promise<void> {
    const result = await this.candidateRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }
  }

  async findCandidatesWithoutConsent(): Promise<CandidateResponseDto[]> {
    const candidates = await this.candidateRepository.find({
      where: { consentGiven: false },
      relations: ['parsedData'],
      order: { createdAt: 'DESC' },
    });

    return candidates.map((candidate) => this.toResponseDto(candidate));
  }

  async updateSkillEmbeddings(
    id: string,
    embeddings: number[],
  ): Promise<CandidateResponseDto> {
    const candidate = await this.candidateRepository.findOne({ where: { id } });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    candidate.skillEmbeddings = embeddings;
    const updatedCandidate = await this.candidateRepository.save(candidate);

    return this.toResponseDto(updatedCandidate);
  }

  private async invalidateCandidateCache(id: string): Promise<void> {
    await this.cacheService.del(`candidate:${id}`, { prefix: 'candidates' });
  }

  private async invalidateCandidateCaches(): Promise<void> {
    await this.cacheService.delPattern('candidates:all:*', {
      prefix: 'candidates',
    });
  }

  async searchCandidates(
    searchTerm: string,
    options: PaginationOptions = {},
  ): Promise<PaginationResult<CandidateResponseDto>> {
    const cacheKey = `candidates:search:${searchTerm}:${JSON.stringify(options)}`;

    // Try to get from cache first
    const cached = await this.cacheService.get<
      PaginationResult<CandidateResponseDto>
    >(
      cacheKey,
      { prefix: 'candidates', ttl: 300 }, // 5 minutes cache
    );

    if (cached) {
      return cached;
    }

    const queryBuilder = this.candidateRepository
      .createQueryBuilder('candidate')
      .leftJoinAndSelect('candidate.parsedData', 'parsedData')
      .leftJoinAndSelect('candidate.applications', 'applications')
      .where(
        '(candidate.firstName ILIKE :search OR candidate.lastName ILIKE :search OR candidate.email ILIKE :search OR candidate.location ILIKE :search)',
        { search: `%${searchTerm}%` },
      );

    const result = await this.paginationService.paginate(queryBuilder, {
      ...options,
      sortBy: options.sortBy || 'candidate.createdAt',
      sortOrder: options.sortOrder || 'DESC',
    });

    const responseResult = {
      ...result,
      data: result.data.map((candidate) => this.toResponseDto(candidate)),
    };

    // Cache the result
    await this.cacheService.set(cacheKey, responseResult, {
      prefix: 'candidates',
      ttl: 300,
    });

    return responseResult;
  }

  private toResponseDto(candidate: Candidate): CandidateResponseDto {
    return {
      id: candidate.id,
      email: candidate.email,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      phone: candidate.phone,
      location: candidate.location,
      linkedinUrl: candidate.linkedinUrl,
      portfolioUrl: candidate.portfolioUrl,
      resumeUrl: candidate.resumeUrl,
      skillEmbeddings: candidate.skillEmbeddings,
      totalExperience: candidate.totalExperience,
      consentGiven: candidate.consentGiven,
      consentDate: candidate.consentDate,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
      parsedData: candidate.parsedData,
      applications: candidate.applications,
    };
  }
}
