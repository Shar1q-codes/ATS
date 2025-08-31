import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StageHistoryEntry } from '../../entities/stage-history-entry.entity';
import { PipelineStage } from '../../entities/application.entity';
import { StageHistoryResponseDto } from '../dto/stage-history-response.dto';

@Injectable()
export class StageHistoryService {
  constructor(
    @InjectRepository(StageHistoryEntry)
    private readonly stageHistoryRepository: Repository<StageHistoryEntry>,
  ) {}

  async findAll(): Promise<StageHistoryResponseDto[]> {
    const entries = await this.stageHistoryRepository.find({
      relations: ['changedBy'],
      order: { changedAt: 'DESC' },
    });

    return entries.map((entry) => this.toResponseDto(entry));
  }

  async findByApplication(
    applicationId: string,
  ): Promise<StageHistoryResponseDto[]> {
    const entries = await this.stageHistoryRepository.find({
      where: { applicationId },
      relations: ['changedBy'],
      order: { changedAt: 'ASC' },
    });

    return entries.map((entry) => this.toResponseDto(entry));
  }

  async findOne(id: string): Promise<StageHistoryResponseDto> {
    const entry = await this.stageHistoryRepository.findOne({
      where: { id },
      relations: ['changedBy'],
    });

    if (!entry) {
      throw new NotFoundException(
        `Stage history entry with ID ${id} not found`,
      );
    }

    return this.toResponseDto(entry);
  }

  async findByUser(userId: string): Promise<StageHistoryResponseDto[]> {
    const entries = await this.stageHistoryRepository.find({
      where: { changedById: userId },
      relations: ['changedBy'],
      order: { changedAt: 'DESC' },
    });

    return entries.map((entry) => this.toResponseDto(entry));
  }

  async findByStage(stage: PipelineStage): Promise<StageHistoryResponseDto[]> {
    const entries = await this.stageHistoryRepository.find({
      where: { toStage: stage },
      relations: ['changedBy'],
      order: { changedAt: 'DESC' },
    });

    return entries.map((entry) => this.toResponseDto(entry));
  }

  async findAutomatedEntries(): Promise<StageHistoryResponseDto[]> {
    const entries = await this.stageHistoryRepository.find({
      where: { automated: true },
      relations: ['changedBy'],
      order: { changedAt: 'DESC' },
    });

    return entries.map((entry) => this.toResponseDto(entry));
  }

  async findManualEntries(): Promise<StageHistoryResponseDto[]> {
    const entries = await this.stageHistoryRepository.find({
      where: { automated: false },
      relations: ['changedBy'],
      order: { changedAt: 'DESC' },
    });

    return entries.map((entry) => this.toResponseDto(entry));
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<StageHistoryResponseDto[]> {
    const entries = await this.stageHistoryRepository.find({
      where: {
        changedAt: Between(startDate, endDate),
      },
      relations: ['changedBy'],
      order: { changedAt: 'DESC' },
    });

    return entries.map((entry) => this.toResponseDto(entry));
  }

  async getApplicationTimeline(
    applicationId: string,
  ): Promise<StageHistoryResponseDto[]> {
    return this.findByApplication(applicationId);
  }

  async getStageTransitionStats(stage: PipelineStage): Promise<{
    totalTransitions: number;
    automatedTransitions: number;
    manualTransitions: number;
    averageTimeInStage?: number;
  }> {
    const entries = await this.stageHistoryRepository.find({
      where: { toStage: stage },
    });

    const totalTransitions = entries.length;
    const automatedTransitions = entries.filter(
      (entry) => entry.automated,
    ).length;
    const manualTransitions = totalTransitions - automatedTransitions;

    // Calculate average time in stage (simplified - would need more complex logic for accurate calculation)
    let averageTimeInStage: number | undefined;
    if (entries.length > 1) {
      const times = entries.slice(0, -1).map((entry, index) => {
        const nextEntry = entries[index + 1];
        return nextEntry.changedAt.getTime() - entry.changedAt.getTime();
      });

      if (times.length > 0) {
        averageTimeInStage =
          times.reduce((sum, time) => sum + time, 0) / times.length;
      }
    }

    return {
      totalTransitions,
      automatedTransitions,
      manualTransitions,
      averageTimeInStage,
    };
  }

  async getUserActivityStats(userId: string): Promise<{
    totalChanges: number;
    stageTransitions: Record<string, number>;
    recentActivity: StageHistoryResponseDto[];
  }> {
    const entries = await this.stageHistoryRepository.find({
      where: { changedById: userId, automated: false },
      relations: ['changedBy'],
      order: { changedAt: 'DESC' },
    });

    const totalChanges = entries.length;

    const stageTransitions: Record<string, number> = {};
    entries.forEach((entry) => {
      const transition = `${entry.fromStage || 'initial'} -> ${entry.toStage}`;
      stageTransitions[transition] = (stageTransitions[transition] || 0) + 1;
    });

    const recentActivity = entries
      .slice(0, 10)
      .map((entry) => this.toResponseDto(entry));

    return {
      totalChanges,
      stageTransitions,
      recentActivity,
    };
  }

  private toResponseDto(entry: StageHistoryEntry): StageHistoryResponseDto {
    return {
      id: entry.id,
      applicationId: entry.applicationId,
      fromStage: entry.fromStage,
      toStage: entry.toStage,
      changedById: entry.changedById,
      changedAt: entry.changedAt,
      notes: entry.notes,
      automated: entry.automated,
      changedBy: entry.changedBy,
    };
  }
}
