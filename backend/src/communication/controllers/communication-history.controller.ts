import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../entities';
import { CommunicationHistoryService } from '../services/communication-history.service';
import {
  CreateCommunicationHistoryDto,
  UpdateCommunicationHistoryDto,
  CommunicationHistoryQueryDto,
  CommunicationHistoryResponseDto,
} from '../dto';

@Controller('communication-history')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommunicationHistoryController {
  constructor(
    private readonly communicationHistoryService: CommunicationHistoryService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async create(
    @Body() createDto: CreateCommunicationHistoryDto,
  ): Promise<CommunicationHistoryResponseDto> {
    const communicationHistory =
      await this.communicationHistoryService.create(createDto);
    return this.mapToResponseDto(communicationHistory);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findAll(@Query() query: CommunicationHistoryQueryDto) {
    const result = await this.communicationHistoryService.findAll(query);
    return {
      ...result,
      data: result.data.map((item) => this.mapToResponseDto(item)),
    };
  }

  @Get('candidate/:candidateId')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findByCandidateId(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
  ): Promise<CommunicationHistoryResponseDto[]> {
    const communications =
      await this.communicationHistoryService.findByCandidateId(candidateId);
    return communications.map((item) => this.mapToResponseDto(item));
  }

  @Get('application/:applicationId')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findByApplicationId(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<CommunicationHistoryResponseDto[]> {
    const communications =
      await this.communicationHistoryService.findByApplicationId(applicationId);
    return communications.map((item) => this.mapToResponseDto(item));
  }

  @Get('candidate/:candidateId/stats')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async getCommunicationStats(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
  ) {
    return await this.communicationHistoryService.getCommunicationStats(
      candidateId,
    );
  }

  @Get('candidate/:candidateId/unread-count')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async getUnreadCount(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
  ): Promise<{ count: number }> {
    const count =
      await this.communicationHistoryService.getUnreadCount(candidateId);
    return { count };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CommunicationHistoryResponseDto> {
    const communicationHistory =
      await this.communicationHistoryService.findOne(id);
    return this.mapToResponseDto(communicationHistory);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateCommunicationHistoryDto,
  ): Promise<CommunicationHistoryResponseDto> {
    const communicationHistory = await this.communicationHistoryService.update(
      id,
      updateDto,
    );
    return this.mapToResponseDto(communicationHistory);
  }

  @Patch(':id/mark-read')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CommunicationHistoryResponseDto> {
    const communicationHistory =
      await this.communicationHistoryService.markAsRead(id);
    return this.mapToResponseDto(communicationHistory);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.communicationHistoryService.remove(id);
    return { message: 'Communication history deleted successfully' };
  }

  private mapToResponseDto(
    communicationHistory: any,
  ): CommunicationHistoryResponseDto {
    return {
      id: communicationHistory.id,
      type: communicationHistory.type,
      direction: communicationHistory.direction,
      subject: communicationHistory.subject,
      content: communicationHistory.content,
      fromAddress: communicationHistory.fromAddress,
      toAddress: communicationHistory.toAddress,
      isRead: communicationHistory.isRead,
      readAt: communicationHistory.readAt,
      candidateId: communicationHistory.candidateId,
      applicationId: communicationHistory.applicationId,
      initiatedBy: communicationHistory.initiatedBy,
      emailLogId: communicationHistory.emailLogId,
      metadata: communicationHistory.metadata,
      createdAt: communicationHistory.createdAt,
      updatedAt: communicationHistory.updatedAt,
    };
  }
}
