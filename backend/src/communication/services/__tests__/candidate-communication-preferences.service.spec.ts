import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CandidateCommunicationPreferencesService } from '../candidate-communication-preferences.service';
import {
  CandidateCommunicationPreferences,
  CommunicationFrequency,
} from '../../../entities';

describe('CandidateCommunicationPreferencesService', () => {
  let service: CandidateCommunicationPreferencesService;
  let repository: jest.Mocked<Repository<CandidateCommunicationPreferences>>;

  const mockPreferences = {
    id: '1',
    candidateId: 'candidate-1',
    emailEnabled: true,
    smsEnabled: false,
    phoneEnabled: true,
    applicationUpdatesFrequency: CommunicationFrequency.IMMEDIATE,
    marketingFrequency: CommunicationFrequency.WEEKLY,
    interviewRemindersFrequency: CommunicationFrequency.IMMEDIATE,
    optedOut: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateCommunicationPreferencesService,
        {
          provide: getRepositoryToken(CandidateCommunicationPreferences),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CandidateCommunicationPreferencesService>(
      CandidateCommunicationPreferencesService,
    );
    repository = module.get(
      getRepositoryToken(CandidateCommunicationPreferences),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create communication preferences', async () => {
      const createDto = {
        candidateId: 'candidate-1',
        emailEnabled: true,
      };

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockPreferences as any);
      repository.save.mockResolvedValue(mockPreferences as any);

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(mockPreferences);
      expect(result).toEqual(mockPreferences);
    });

    it('should throw ConflictException if preferences already exist', async () => {
      const createDto = {
        candidateId: 'candidate-1',
        emailEnabled: true,
      };

      repository.findOne.mockResolvedValue(mockPreferences as any);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findByCandidateId', () => {
    it('should return existing preferences', async () => {
      repository.findOne.mockResolvedValue(mockPreferences as any);

      const result = await service.findByCandidateId('candidate-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { candidateId: 'candidate-1' },
        relations: ['candidate'],
      });
      expect(result).toEqual(mockPreferences);
    });

    it('should create default preferences if none exist', async () => {
      repository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      repository.create.mockReturnValue(mockPreferences as any);
      repository.save.mockResolvedValue(mockPreferences as any);

      const result = await service.findByCandidateId('candidate-1');

      expect(repository.create).toHaveBeenCalled();
      expect(result).toEqual(mockPreferences);
    });
  });

  describe('update', () => {
    it('should update preferences', async () => {
      const updateDto = { emailEnabled: false };
      const updatedPreferences = { ...mockPreferences, emailEnabled: false };

      repository.findOne.mockResolvedValue(mockPreferences as any);
      repository.save.mockResolvedValue(updatedPreferences as any);

      const result = await service.update('1', updateDto);

      expect(result.emailEnabled).toBe(false);
    });
  });

  describe('optOut', () => {
    it('should opt out candidate', async () => {
      const optOutDto = { reason: 'Too many emails' };
      const optedOutPreferences = {
        ...mockPreferences,
        optedOut: true,
        optedOutAt: expect.any(Date),
        optOutReason: 'Too many emails',
      };

      repository.findOne.mockResolvedValue(mockPreferences as any);
      repository.save.mockResolvedValue(optedOutPreferences as any);

      const result = await service.optOut('candidate-1', optOutDto);

      expect(result.optedOut).toBe(true);
      expect(result.optOutReason).toBe('Too many emails');
    });
  });

  describe('optIn', () => {
    it('should opt in candidate', async () => {
      const optedOutPreferences = {
        ...mockPreferences,
        optedOut: true,
        optedOutAt: new Date(),
        optOutReason: 'Test reason',
      };
      const optedInPreferences = {
        ...mockPreferences,
        optedOut: false,
        optedOutAt: null,
        optOutReason: null,
      };

      repository.findOne.mockResolvedValue(optedOutPreferences as any);
      repository.save.mockResolvedValue(optedInPreferences as any);

      const result = await service.optIn('candidate-1');

      expect(result.optedOut).toBe(false);
      expect(result.optedOutAt).toBeNull();
      expect(result.optOutReason).toBeNull();
    });
  });

  describe('canSendCommunication', () => {
    it('should return true for enabled email communication', async () => {
      jest
        .spyOn(service, 'findByCandidateId')
        .mockResolvedValue(mockPreferences as any);

      const result = await service.canSendCommunication('candidate-1', 'email');

      expect(result).toBe(true);
    });

    it('should return false for disabled SMS communication', async () => {
      jest
        .spyOn(service, 'findByCandidateId')
        .mockResolvedValue(mockPreferences as any);

      const result = await service.canSendCommunication('candidate-1', 'sms');

      expect(result).toBe(false);
    });

    it('should return false if candidate opted out', async () => {
      const optedOutPreferences = { ...mockPreferences, optedOut: true };
      jest
        .spyOn(service, 'findByCandidateId')
        .mockResolvedValue(optedOutPreferences as any);

      const result = await service.canSendCommunication('candidate-1', 'email');

      expect(result).toBe(false);
    });
  });

  describe('shouldSendApplicationUpdate', () => {
    it('should return true for immediate frequency', async () => {
      jest
        .spyOn(service, 'findByCandidateId')
        .mockResolvedValue(mockPreferences as any);

      const result = await service.shouldSendApplicationUpdate('candidate-1');

      expect(result).toBe(true);
    });

    it('should return false for never frequency', async () => {
      const neverPreferences = {
        ...mockPreferences,
        applicationUpdatesFrequency: CommunicationFrequency.NEVER,
      };
      jest
        .spyOn(service, 'findByCandidateId')
        .mockResolvedValue(neverPreferences as any);

      const result = await service.shouldSendApplicationUpdate('candidate-1');

      expect(result).toBe(false);
    });

    it('should return false if opted out', async () => {
      const optedOutPreferences = { ...mockPreferences, optedOut: true };
      jest
        .spyOn(service, 'findByCandidateId')
        .mockResolvedValue(optedOutPreferences as any);

      const result = await service.shouldSendApplicationUpdate('candidate-1');

      expect(result).toBe(false);
    });
  });

  describe('getOptedOutCandidates', () => {
    it('should return opted out candidates', async () => {
      const optedOutCandidates = [{ ...mockPreferences, optedOut: true }];
      repository.find.mockResolvedValue(optedOutCandidates as any);

      const result = await service.getOptedOutCandidates();

      expect(repository.find).toHaveBeenCalledWith({
        where: { optedOut: true },
        relations: ['candidate'],
        order: { optedOutAt: 'DESC' },
      });
      expect(result).toEqual(optedOutCandidates);
    });
  });
});
