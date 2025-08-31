import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import {
  CommunicationHistory,
  CommunicationType,
  CommunicationDirection,
} from '../../entities';
import {
  CreateCommunicationHistoryDto,
  UpdateCommunicationHistoryDto,
  CommunicationHistoryQueryDto,
} from '../dto';

@Injectable()
export class CommunicationHistoryService {
  constructor(
    @InjectRepository(CommunicationHistory)
    private readonly communicationHistoryRepository: Repository<CommunicationHistory>,
  ) {}

  async create(
    createDto: CreateCommunicationHistoryDto,
  ): Promise<CommunicationHistory> {
    const communicationHistory =
      this.communicationHistoryRepository.create(createDto);
    return await this.communicationHistoryRepository.save(communicationHistory);
  }

  async findAll(query: CommunicationHistoryQueryDto): Promise<{
    data: CommunicationHistory[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (query.candidateId) {
      whereConditions.candidateId = query.candidateId;
    }

    if (query.applicationId) {
      whereConditions.applicationId = query.applicationId;
    }

    if (query.type) {
      whereConditions.type = query.type;
    }

    if (query.direction) {
      whereConditions.direction = query.direction;
    }

    const findOptions: FindManyOptions<CommunicationHistory> = {
      where: whereConditions,
      relations: ['candidate', 'application', 'initiator'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    };

    const [data, total] =
      await this.communicationHistoryRepository.findAndCount(findOptions);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<CommunicationHistory> {
    const communicationHistory =
      await this.communicationHistoryRepository.findOne({
        where: { id },
        relations: ['candidate', 'application', 'initiator'],
      });

    if (!communicationHistory) {
      throw new NotFoundException(
        `Communication history with ID ${id} not found`,
      );
    }

    return communicationHistory;
  }

  async findByCandidateId(
    candidateId: string,
  ): Promise<CommunicationHistory[]> {
    return await this.communicationHistoryRepository.find({
      where: { candidateId },
      relations: ['application', 'initiator'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByApplicationId(
    applicationId: string,
  ): Promise<CommunicationHistory[]> {
    return await this.communicationHistoryRepository.find({
      where: { applicationId },
      relations: ['candidate', 'initiator'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: string,
    updateDto: UpdateCommunicationHistoryDto,
  ): Promise<CommunicationHistory> {
    const communicationHistory = await this.findOne(id);

    Object.assign(communicationHistory, updateDto);

    return await this.communicationHistoryRepository.save(communicationHistory);
  }

  async markAsRead(id: string): Promise<CommunicationHistory> {
    return await this.update(id, {
      isRead: true,
      readAt: new Date(),
    });
  }

  async remove(id: string): Promise<void> {
    const communicationHistory = await this.findOne(id);
    await this.communicationHistoryRepository.remove(communicationHistory);
  }

  async getUnreadCount(candidateId: string): Promise<number> {
    return await this.communicationHistoryRepository.count({
      where: {
        candidateId,
        isRead: false,
        direction: CommunicationDirection.OUTBOUND,
      },
    });
  }

  async getCommunicationStats(candidateId: string): Promise<{
    totalCommunications: number;
    emailCount: number;
    inboundCount: number;
    outboundCount: number;
    lastCommunication?: Date;
  }> {
    const communications = await this.communicationHistoryRepository.find({
      where: { candidateId },
      select: ['type', 'direction', 'createdAt'],
      order: { createdAt: 'DESC' },
    });

    const stats = {
      totalCommunications: communications.length,
      emailCount: communications.filter(
        (c) => c.type === CommunicationType.EMAIL,
      ).length,
      inboundCount: communications.filter(
        (c) => c.direction === CommunicationDirection.INBOUND,
      ).length,
      outboundCount: communications.filter(
        (c) => c.direction === CommunicationDirection.OUTBOUND,
      ).length,
      lastCommunication:
        communications.length > 0 ? communications[0].createdAt : undefined,
    };

    return stats;
  }

  async logEmailCommunication(
    candidateId: string,
    subject: string,
    content: string,
    direction: CommunicationDirection,
    applicationId?: string,
    initiatedBy?: string,
    emailLogId?: string,
    fromAddress?: string,
    toAddress?: string,
  ): Promise<CommunicationHistory> {
    const createDto: CreateCommunicationHistoryDto = {
      type: CommunicationType.EMAIL,
      direction,
      subject,
      content,
      candidateId,
      applicationId,
      initiatedBy,
      emailLogId,
      fromAddress,
      toAddress,
    };

    return await this.create(createDto);
  }
}
