import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Query,
  ParseEnumPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../entities/user.entity';
import { PipelineStage } from '../../entities/application.entity';
import { ApplicationService } from '../services/application.service';
import { CreateApplicationDto } from '../dto/create-application.dto';
import { UpdateApplicationDto } from '../dto/update-application.dto';
import { ApplicationResponseDto } from '../dto/application-response.dto';
import { StageTransitionDto } from '../dto/stage-transition.dto';
import { ApplicationFilterDto } from '../dto/application-filter.dto';
import { BatchCalculateFitScoresDto } from '../dto/batch-calculate-fit-scores.dto';

@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createApplicationDto: CreateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    return this.applicationService.create(createApplicationDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findAll(
    @Query() filterDto: ApplicationFilterDto,
  ): Promise<ApplicationResponseDto[]> {
    return this.applicationService.findAll(filterDto);
  }

  @Get('by-stage/:stage')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findByStage(
    @Param('stage', new ParseEnumPipe(PipelineStage)) stage: PipelineStage,
  ): Promise<ApplicationResponseDto[]> {
    return this.applicationService.getApplicationsByStage(stage);
  }

  @Get('by-candidate/:candidateId')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findByCandidate(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
  ): Promise<ApplicationResponseDto[]> {
    return this.applicationService.findByCandidate(candidateId);
  }

  @Get('by-job-variant/:jobVariantId')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findByJobVariant(
    @Param('jobVariantId', ParseUUIDPipe) jobVariantId: string,
  ): Promise<ApplicationResponseDto[]> {
    return this.applicationService.findByJobVariant(jobVariantId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApplicationResponseDto> {
    return this.applicationService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateApplicationDto: UpdateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    return this.applicationService.update(id, updateApplicationDto);
  }

  @Patch(':id/stage')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async transitionStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() stageTransitionDto: StageTransitionDto,
    @CurrentUser('id') userId: string,
  ): Promise<ApplicationResponseDto> {
    return this.applicationService.transitionStage(
      id,
      stageTransitionDto,
      userId,
    );
  }

  @Patch(':id/fit-score')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async updateFitScore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('fitScore') fitScore: number,
  ): Promise<ApplicationResponseDto> {
    return this.applicationService.updateFitScore(id, fitScore);
  }

  @Patch(':id/recalculate-fit-score')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async recalculateFitScore(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApplicationResponseDto> {
    return this.applicationService.recalculateFitScore(id);
  }

  @Post('batch-calculate-fit-scores')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.ACCEPTED)
  async batchCalculateFitScores(
    @Body() batchCalculateDto: BatchCalculateFitScoresDto,
  ): Promise<{ message: string }> {
    await this.applicationService.batchCalculateFitScores(
      batchCalculateDto.jobVariantId,
      batchCalculateDto.candidateIds,
    );
    return {
      message: 'Batch fit score calculation has been queued for processing',
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.applicationService.remove(id);
  }
}
