import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Query,
  ParseEnumPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../entities/user.entity';
import { PipelineStage } from '../../entities/application.entity';
import { StageHistoryService } from '../services/stage-history.service';
import { StageHistoryResponseDto } from '../dto/stage-history-response.dto';

@Controller('stage-history')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StageHistoryController {
  constructor(private readonly stageHistoryService: StageHistoryService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findAll(
    @Query('automated', new ParseBoolPipe({ optional: true }))
    automated?: boolean,
  ): Promise<StageHistoryResponseDto[]> {
    if (automated === true) {
      return this.stageHistoryService.findAutomatedEntries();
    } else if (automated === false) {
      return this.stageHistoryService.findManualEntries();
    }
    return this.stageHistoryService.findAll();
  }

  @Get('by-application/:applicationId')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findByApplication(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<StageHistoryResponseDto[]> {
    return this.stageHistoryService.findByApplication(applicationId);
  }

  @Get('by-application/:applicationId/timeline')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async getApplicationTimeline(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<StageHistoryResponseDto[]> {
    return this.stageHistoryService.getApplicationTimeline(applicationId);
  }

  @Get('by-user/:userId')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<StageHistoryResponseDto[]> {
    return this.stageHistoryService.findByUser(userId);
  }

  @Get('my-activity')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findMyActivity(
    @CurrentUser('id') userId: string,
  ): Promise<StageHistoryResponseDto[]> {
    return this.stageHistoryService.findByUser(userId);
  }

  @Get('by-stage/:stage')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findByStage(
    @Param('stage', new ParseEnumPipe(PipelineStage)) stage: PipelineStage,
  ): Promise<StageHistoryResponseDto[]> {
    return this.stageHistoryService.findByStage(stage);
  }

  @Get('stats/stage/:stage')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async getStageTransitionStats(
    @Param('stage', new ParseEnumPipe(PipelineStage)) stage: PipelineStage,
  ): Promise<{
    totalTransitions: number;
    automatedTransitions: number;
    manualTransitions: number;
    averageTimeInStage?: number;
  }> {
    return this.stageHistoryService.getStageTransitionStats(stage);
  }

  @Get('stats/user/:userId')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async getUserActivityStats(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<{
    totalChanges: number;
    stageTransitions: Record<string, number>;
    recentActivity: StageHistoryResponseDto[];
  }> {
    return this.stageHistoryService.getUserActivityStats(userId);
  }

  @Get('stats/my-activity')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async getMyActivityStats(@CurrentUser('id') userId: string): Promise<{
    totalChanges: number;
    stageTransitions: Record<string, number>;
    recentActivity: StageHistoryResponseDto[];
  }> {
    return this.stageHistoryService.getUserActivityStats(userId);
  }

  @Get('date-range')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<StageHistoryResponseDto[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.stageHistoryService.findByDateRange(start, end);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StageHistoryResponseDto> {
    return this.stageHistoryService.findOne(id);
  }
}
