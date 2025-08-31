import { Test, TestingModule } from '@nestjs/testing';
import { CandidateCommunicationPreferencesController } from '../candidate-communication-preferences.controller';
import { CandidateCommunicationPreferencesService } from '../../services/candidate-communication-preferences.service';
import { CommunicationFrequency } from '../../../entities';

describe('CandidateCommunicationPreferencesController', () => {
  let controller: CandidateCommunicationPreferencesController;
  let service: jest.Mocked<CandidateCommunicationPreferencesService>;

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
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByCandidateId: jest.fn(),
      update: jest.fn(),
      updateByCandidateId: jest.fn(),
      optOut: jest.fn(),
      optIn: jest.fn(),
      remove: jest.fn(),
      canSendCommunication: jest.fn(),
      getOptedOutCandidates: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidateCommunicationPreferencesController],
      providers: [
        {
          provide: CandidateCommunicationPreferencesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CandidateCommunicationPreferencesController>(
      CandidateCommunicationPreferencesController,
    );
    service = module.get(CandidateCommunicationPreferencesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create communication preferences', async () => {
      const createDto = {
        candidateId: 'candidate-1',
        emailEnabled: true,
      };

      service.create.mockResolvedValue(mockPreferences as any);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(
        expect.objectContaining({
          id: '1',
          candidateId: 'candidate-1',
          emailEnabled: true,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all communication preferences', async () => {
      service.findAll.mockResolvedValue([mockPreferences] as any);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([expect.objectContaining({ id: '1' })]);
    });
  });

  describe('getOptedOutCandidates', () => {
    it('should return opted out candidates', async () => {
      const optedOutPreferences = { ...mockPreferences, optedOut: true };
      service.getOptedOutCandidates.mockResolvedValue([
        optedOutPreferences,
      ] as any);

      const result = await controller.getOptedOutCandidates();

      expect(service.getOptedOutCandidates).toHaveBeenCalled();
      expect(result).toEqual([expect.objectContaining({ optedOut: true })]);
    });
  });

  describe('findByCandidateId', () => {
    it('should return preferences for candidate', async () => {
      service.findByCandidateId.mockResolvedValue(mockPreferences as any);

      const result = await controller.findByCandidateId('candidate-1');

      expect(service.findByCandidateId).toHaveBeenCalledWith('candidate-1');
      expect(result).toEqual(
        expect.objectContaining({ candidateId: 'candidate-1' }),
      );
    });
  });

  describe('canSendCommunication', () => {
    it('should check if communication can be sent', async () => {
      service.canSendCommunication.mockResolvedValue(true);

      const result = await controller.canSendCommunication(
        'candidate-1',
        'email',
      );

      expect(service.canSendCommunication).toHaveBeenCalledWith(
        'candidate-1',
        'email',
      );
      expect(result).toEqual({ canSend: true });
    });
  });

  describe('findOne', () => {
    it('should return single preferences', async () => {
      service.findOne.mockResolvedValue(mockPreferences as any);

      const result = await controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith('1');
      expect(result).toEqual(expect.objectContaining({ id: '1' }));
    });
  });

  describe('update', () => {
    it('should update preferences', async () => {
      const updateDto = { emailEnabled: false };
      const updatedPreferences = { ...mockPreferences, emailEnabled: false };

      service.update.mockResolvedValue(updatedPreferences as any);

      const result = await controller.update('1', updateDto);

      expect(service.update).toHaveBeenCalledWith('1', updateDto);
      expect(result.emailEnabled).toBe(false);
    });
  });

  describe('updateByCandidateId', () => {
    it('should update preferences by candidate ID', async () => {
      const updateDto = { smsEnabled: true };
      const updatedPreferences = { ...mockPreferences, smsEnabled: true };

      service.updateByCandidateId.mockResolvedValue(updatedPreferences as any);

      const result = await controller.updateByCandidateId(
        'candidate-1',
        updateDto,
      );

      expect(service.updateByCandidateId).toHaveBeenCalledWith(
        'candidate-1',
        updateDto,
      );
      expect(result.smsEnabled).toBe(true);
    });
  });

  describe('optOut', () => {
    it('should opt out candidate', async () => {
      const optOutDto = { reason: 'Too many emails' };
      const optedOutPreferences = {
        ...mockPreferences,
        optedOut: true,
        optOutReason: 'Too many emails',
      };

      service.optOut.mockResolvedValue(optedOutPreferences as any);

      const result = await controller.optOut('candidate-1', optOutDto);

      expect(service.optOut).toHaveBeenCalledWith('candidate-1', optOutDto);
      expect(result.optedOut).toBe(true);
      expect(result.optOutReason).toBe('Too many emails');
    });
  });

  describe('optIn', () => {
    it('should opt in candidate', async () => {
      const optedInPreferences = { ...mockPreferences, optedOut: false };

      service.optIn.mockResolvedValue(optedInPreferences as any);

      const result = await controller.optIn('candidate-1');

      expect(service.optIn).toHaveBeenCalledWith('candidate-1');
      expect(result.optedOut).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove preferences', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        message: 'Communication preferences deleted successfully',
      });
    });
  });
});
