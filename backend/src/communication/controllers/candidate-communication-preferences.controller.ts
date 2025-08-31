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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../entities';
import { CandidateCommunicationPreferencesService } from '../services/candidate-communication-preferences.service';
import {
  CreateCandidateCommunicationPreferencesDto,
  UpdateCandidateCommunicationPreferencesDto,
  OptOutDto,
  CandidateCommunicationPreferencesResponseDto,
} from '../dto';

@Controller('candidate-communication-preferences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CandidateCommunicationPreferencesController {
  constructor(
    private readonly preferencesService: CandidateCommunicationPreferencesService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async create(
    @Body() createDto: CreateCandidateCommunicationPreferencesDto,
  ): Promise<CandidateCommunicationPreferencesResponseDto> {
    const preferences = await this.preferencesService.create(createDto);
    return this.mapToResponseDto(preferences);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async findAll(): Promise<CandidateCommunicationPreferencesResponseDto[]> {
    const preferences = await this.preferencesService.findAll();
    return preferences.map((item) => this.mapToResponseDto(item));
  }

  @Get('opted-out')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async getOptedOutCandidates(): Promise<
    CandidateCommunicationPreferencesResponseDto[]
  > {
    const preferences = await this.preferencesService.getOptedOutCandidates();
    return preferences.map((item) => this.mapToResponseDto(item));
  }

  @Get('candidate/:candidateId')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findByCandidateId(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
  ): Promise<CandidateCommunicationPreferencesResponseDto> {
    const preferences =
      await this.preferencesService.findByCandidateId(candidateId);
    return this.mapToResponseDto(preferences);
  }

  @Get('candidate/:candidateId/can-send/:type')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async canSendCommunication(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
    @Param('type') type: 'email' | 'sms' | 'phone',
  ): Promise<{ canSend: boolean }> {
    const canSend = await this.preferencesService.canSendCommunication(
      candidateId,
      type,
    );
    return { canSend };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CandidateCommunicationPreferencesResponseDto> {
    const preferences = await this.preferencesService.findOne(id);
    return this.mapToResponseDto(preferences);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateCandidateCommunicationPreferencesDto,
  ): Promise<CandidateCommunicationPreferencesResponseDto> {
    const preferences = await this.preferencesService.update(id, updateDto);
    return this.mapToResponseDto(preferences);
  }

  @Patch('candidate/:candidateId')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async updateByCandidateId(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
    @Body() updateDto: UpdateCandidateCommunicationPreferencesDto,
  ): Promise<CandidateCommunicationPreferencesResponseDto> {
    const preferences = await this.preferencesService.updateByCandidateId(
      candidateId,
      updateDto,
    );
    return this.mapToResponseDto(preferences);
  }

  @Post('candidate/:candidateId/opt-out')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async optOut(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
    @Body() optOutDto: OptOutDto,
  ): Promise<CandidateCommunicationPreferencesResponseDto> {
    const preferences = await this.preferencesService.optOut(
      candidateId,
      optOutDto,
    );
    return this.mapToResponseDto(preferences);
  }

  @Post('candidate/:candidateId/opt-in')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async optIn(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
  ): Promise<CandidateCommunicationPreferencesResponseDto> {
    const preferences = await this.preferencesService.optIn(candidateId);
    return this.mapToResponseDto(preferences);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.preferencesService.remove(id);
    return { message: 'Communication preferences deleted successfully' };
  }

  private mapToResponseDto(
    preferences: any,
  ): CandidateCommunicationPreferencesResponseDto {
    return {
      id: preferences.id,
      candidateId: preferences.candidateId,
      emailEnabled: preferences.emailEnabled,
      smsEnabled: preferences.smsEnabled,
      phoneEnabled: preferences.phoneEnabled,
      applicationUpdatesFrequency: preferences.applicationUpdatesFrequency,
      marketingFrequency: preferences.marketingFrequency,
      interviewRemindersFrequency: preferences.interviewRemindersFrequency,
      optedOut: preferences.optedOut,
      optedOutAt: preferences.optedOutAt,
      optOutReason: preferences.optOutReason,
      preferredTimes: preferences.preferredTimes,
      timezone: preferences.timezone,
      createdAt: preferences.createdAt,
      updatedAt: preferences.updatedAt,
    };
  }
}
