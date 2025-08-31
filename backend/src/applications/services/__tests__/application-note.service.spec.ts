import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApplicationNoteService } from '../application-note.service';
import { ApplicationNote } from '../../../entities/application-note.entity';
import { Application } from '../../../entities/application.entity';
import { CreateApplicationNoteDto } from '../../dto/create-application-note.dto';
import { UpdateApplicationNoteDto } from '../../dto/update-application-note.dto';

describe('ApplicationNoteService', () => {
  let service: ApplicationNoteService;
  let applicationNoteRepository: jest.Mocked<Repository<ApplicationNote>>;
  let applicationRepository: jest.Mocked<Repository<Application>>;

  const mockApplication: Application = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    candidateId: '123e4567-e89b-12d3-a456-426614174001',
    companyJobVariantId: '123e4567-e89b-12d3-a456-426614174002',
    status: null,
    fitScore: 85,
    appliedAt: new Date('2024-01-01'),
    lastUpdated: new Date('2024-01-01'),
    candidate: null,
    companyJobVariant: null,
    matchExplanation: null,
    notes: [],
    stageHistory: [],
  };

  const mockApplicationNote: ApplicationNote = {
    id: '123e4567-e89b-12d3-a456-426614174003',
    applicationId: mockApplication.id,
    userId: 'user-123',
    note: 'Test note',
    isInternal: true,
    createdAt: new Date('2024-01-01'),
    application: null,
    user: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationNoteService,
        {
          provide: getRepositoryToken(ApplicationNote),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Application),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ApplicationNoteService>(ApplicationNoteService);
    applicationNoteRepository = module.get(getRepositoryToken(ApplicationNote));
    applicationRepository = module.get(getRepositoryToken(Application));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createApplicationNoteDto: CreateApplicationNoteDto = {
      applicationId: mockApplication.id,
      note: 'Test note',
      isInternal: true,
    };

    it('should create a new application note successfully', async () => {
      applicationRepository.findOne.mockResolvedValue(mockApplication);
      applicationNoteRepository.create.mockReturnValue(mockApplicationNote);
      applicationNoteRepository.save.mockResolvedValue(mockApplicationNote);

      const result = await service.create(createApplicationNoteDto, 'user-123');

      expect(applicationRepository.findOne).toHaveBeenCalledWith({
        where: { id: createApplicationNoteDto.applicationId },
      });
      expect(applicationNoteRepository.create).toHaveBeenCalledWith({
        ...createApplicationNoteDto,
        userId: 'user-123',
      });
      expect(applicationNoteRepository.save).toHaveBeenCalledWith(
        mockApplicationNote,
      );
      expect(result.id).toBe(mockApplicationNote.id);
    });

    it('should throw NotFoundException if application not found', async () => {
      applicationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(createApplicationNoteDto, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all application notes', async () => {
      applicationNoteRepository.find.mockResolvedValue([mockApplicationNote]);

      const result = await service.findAll();

      expect(applicationNoteRepository.find).toHaveBeenCalledWith({
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockApplicationNote.id);
    });
  });

  describe('findByApplication', () => {
    it('should return notes for an application', async () => {
      applicationNoteRepository.find.mockResolvedValue([mockApplicationNote]);

      const result = await service.findByApplication(mockApplication.id);

      expect(applicationNoteRepository.find).toHaveBeenCalledWith({
        where: { applicationId: mockApplication.id },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].applicationId).toBe(mockApplication.id);
    });
  });

  describe('findOne', () => {
    it('should return an application note by id', async () => {
      applicationNoteRepository.findOne.mockResolvedValue(mockApplicationNote);

      const result = await service.findOne(mockApplicationNote.id);

      expect(applicationNoteRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockApplicationNote.id },
        relations: ['user'],
      });
      expect(result.id).toBe(mockApplicationNote.id);
    });

    it('should throw NotFoundException if note not found', async () => {
      applicationNoteRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateApplicationNoteDto: UpdateApplicationNoteDto = {
      note: 'Updated note',
    };

    it('should update an application note successfully', async () => {
      const updatedNote = { ...mockApplicationNote, note: 'Updated note' };
      applicationNoteRepository.findOne.mockResolvedValue(mockApplicationNote);
      applicationNoteRepository.save.mockResolvedValue(updatedNote);

      const result = await service.update(
        mockApplicationNote.id,
        updateApplicationNoteDto,
        'user-123',
      );

      expect(applicationNoteRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockApplicationNote.id },
      });
      expect(applicationNoteRepository.save).toHaveBeenCalled();
      expect(result.note).toBe('Updated note');
    });

    it('should throw NotFoundException if note not found', async () => {
      applicationNoteRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateApplicationNoteDto, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the note creator', async () => {
      applicationNoteRepository.findOne.mockResolvedValue(mockApplicationNote);

      await expect(
        service.update(
          mockApplicationNote.id,
          updateApplicationNoteDto,
          'different-user',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should remove an application note successfully', async () => {
      applicationNoteRepository.findOne.mockResolvedValue(mockApplicationNote);
      applicationNoteRepository.remove.mockResolvedValue(mockApplicationNote);

      await service.remove(mockApplicationNote.id, 'user-123');

      expect(applicationNoteRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockApplicationNote.id },
      });
      expect(applicationNoteRepository.remove).toHaveBeenCalledWith(
        mockApplicationNote,
      );
    });

    it('should throw NotFoundException if note not found', async () => {
      applicationNoteRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('non-existent-id', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the note creator', async () => {
      applicationNoteRepository.findOne.mockResolvedValue(mockApplicationNote);

      await expect(
        service.remove(mockApplicationNote.id, 'different-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByUser', () => {
    it('should return notes by user', async () => {
      applicationNoteRepository.find.mockResolvedValue([mockApplicationNote]);

      const result = await service.findByUser('user-123');

      expect(applicationNoteRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-123');
    });
  });

  describe('findInternalNotes', () => {
    it('should return internal notes for an application', async () => {
      applicationNoteRepository.find.mockResolvedValue([mockApplicationNote]);

      const result = await service.findInternalNotes(mockApplication.id);

      expect(applicationNoteRepository.find).toHaveBeenCalledWith({
        where: { applicationId: mockApplication.id, isInternal: true },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].isInternal).toBe(true);
    });
  });

  describe('findExternalNotes', () => {
    it('should return external notes for an application', async () => {
      const externalNote = { ...mockApplicationNote, isInternal: false };
      applicationNoteRepository.find.mockResolvedValue([externalNote]);

      const result = await service.findExternalNotes(mockApplication.id);

      expect(applicationNoteRepository.find).toHaveBeenCalledWith({
        where: { applicationId: mockApplication.id, isInternal: false },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].isInternal).toBe(false);
    });
  });
});
