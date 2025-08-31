import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CandidateCommunicationPreferences,
  CommunicationFrequency,
} from '../../entities';
import {
  CreateCandidateCommunicationPreferencesDto,
  UpdateCandidateCommunicationPreferencesDto,
  OptOutDto,
} from '../dto';

@Injectable()
export class CandidateCommunicationPreferencesService {
  constructor(
    @InjectRepository(CandidateCommunicationPreferences)
    private readonly preferencesRepository: Repository<CandidateCommunicationPreferences>,
  ) {}

  async create(
    createDto: CreateCandidateCommunicationPreferencesDto,
  ): Promise<CandidateCommunicationPreferences> {
    // Check if preferences already exist for this candidate
    const existingPreferences = await this.preferencesRepository.findOne({
      where: { candidateId: createDto.candidateId },
    });

    if (existingPreferences) {
      throw new ConflictException(
        `Communication preferences already exist for candidate ${createDto.candidateId}`,
      );
    }

    const preferences = this.preferencesRepository.create(createDto);
    return await this.preferencesRepository.save(preferences);
  }

  async findAll(): Promise<CandidateCommunicationPreferences[]> {
    return await this.preferencesRepository.find({
      relations: ['candidate'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<CandidateCommunicationPreferences> {
    const preferences = await this.preferencesRepository.findOne({
      where: { id },
      relations: ['candidate'],
    });

    if (!preferences) {
      throw new NotFoundException(
        `Communication preferences with ID ${id} not found`,
      );
    }

    return preferences;
  }

  async findByCandidateId(
    candidateId: string,
  ): Promise<CandidateCommunicationPreferences> {
    const preferences = await this.preferencesRepository.findOne({
      where: { candidateId },
      relations: ['candidate'],
    });

    if (!preferences) {
      // Create default preferences if none exist
      return await this.createDefaultPreferences(candidateId);
    }

    return preferences;
  }

  async update(
    id: string,
    updateDto: UpdateCandidateCommunicationPreferencesDto,
  ): Promise<CandidateCommunicationPreferences> {
    const preferences = await this.findOne(id);

    Object.assign(preferences, updateDto);

    return await this.preferencesRepository.save(preferences);
  }

  async updateByCandidateId(
    candidateId: string,
    updateDto: UpdateCandidateCommunicationPreferencesDto,
  ): Promise<CandidateCommunicationPreferences> {
    const preferences = await this.findByCandidateId(candidateId);

    Object.assign(preferences, updateDto);

    return await this.preferencesRepository.save(preferences);
  }

  async optOut(
    candidateId: string,
    optOutDto: OptOutDto,
  ): Promise<CandidateCommunicationPreferences> {
    const preferences = await this.findByCandidateId(candidateId);

    preferences.optedOut = true;
    preferences.optedOutAt = new Date();
    preferences.optOutReason = optOutDto.reason;

    return await this.preferencesRepository.save(preferences);
  }

  async optIn(candidateId: string): Promise<CandidateCommunicationPreferences> {
    const preferences = await this.findByCandidateId(candidateId);

    preferences.optedOut = false;
    preferences.optedOutAt = null;
    preferences.optOutReason = null;

    return await this.preferencesRepository.save(preferences);
  }

  async remove(id: string): Promise<void> {
    const preferences = await this.findOne(id);
    await this.preferencesRepository.remove(preferences);
  }

  async canSendCommunication(
    candidateId: string,
    communicationType: 'email' | 'sms' | 'phone',
  ): Promise<boolean> {
    const preferences = await this.findByCandidateId(candidateId);

    // If opted out, cannot send any communication
    if (preferences.optedOut) {
      return false;
    }

    // Check specific channel preferences
    switch (communicationType) {
      case 'email':
        return preferences.emailEnabled;
      case 'sms':
        return preferences.smsEnabled;
      case 'phone':
        return preferences.phoneEnabled;
      default:
        return false;
    }
  }

  async shouldSendApplicationUpdate(candidateId: string): Promise<boolean> {
    const preferences = await this.findByCandidateId(candidateId);

    if (preferences.optedOut) {
      return false;
    }

    return (
      preferences.applicationUpdatesFrequency !== CommunicationFrequency.NEVER
    );
  }

  async shouldSendMarketingCommunication(
    candidateId: string,
  ): Promise<boolean> {
    const preferences = await this.findByCandidateId(candidateId);

    if (preferences.optedOut) {
      return false;
    }

    return preferences.marketingFrequency !== CommunicationFrequency.NEVER;
  }

  async shouldSendInterviewReminder(candidateId: string): Promise<boolean> {
    const preferences = await this.findByCandidateId(candidateId);

    if (preferences.optedOut) {
      return false;
    }

    return (
      preferences.interviewRemindersFrequency !== CommunicationFrequency.NEVER
    );
  }

  async getOptedOutCandidates(): Promise<CandidateCommunicationPreferences[]> {
    return await this.preferencesRepository.find({
      where: { optedOut: true },
      relations: ['candidate'],
      order: { optedOutAt: 'DESC' },
    });
  }

  private async createDefaultPreferences(
    candidateId: string,
  ): Promise<CandidateCommunicationPreferences> {
    const defaultPreferences: CreateCandidateCommunicationPreferencesDto = {
      candidateId,
      emailEnabled: true,
      smsEnabled: false,
      phoneEnabled: true,
      applicationUpdatesFrequency: CommunicationFrequency.IMMEDIATE,
      marketingFrequency: CommunicationFrequency.WEEKLY,
      interviewRemindersFrequency: CommunicationFrequency.IMMEDIATE,
    };

    return await this.create(defaultPreferences);
  }
}
