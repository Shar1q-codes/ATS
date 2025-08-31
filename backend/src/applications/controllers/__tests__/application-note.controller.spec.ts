import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationNoteController } from '../application-note.controller';
import { ApplicationNoteService } from '../../services/application-note.service';
import { CreateApplicationNoteDto } from '../../dto/create-application-note.dto';
import { UpdateApplicationNoteDto } from '../../dto/update-application-note.dto';
import { ApplicationNoteResponseDto } from '../../dto/application-note-response.dto';

describe('ApplicationNoteController', () => {
  let controller: ApplicationNoteController;
  let service: jest.Mocked<ApplicationNoteService>;

  const mockApplicationNoteResponse: ApplicationNoteResponseDto = {
    id: '123e4567-e89b-12d3-a456-426614174003',
    applicationId: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-123',
    note: 'Test note',
    isInternal: true,
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationNoteController],
      providers: [
        {
          provide: ApplicationNoteService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findByApplication: jest.fn(),
            findInternalNotes: jest.fn(),
            findExternalNotes: jest.fn(),
            findByUser: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ApplicationNoteController>(
      ApplicationNoteController,
    );
    service = module.get(ApplicationNoteService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new application note', async () => {
      const createApplicationNoteDto: CreateApplicationNoteDto = {
        applicationId: '123e4567-e89b-12d3-a456-426614174000',
        note: 'Test note',
        isInternal: true,
      };

      service.create.mockResolvedValue(mockApplicationNoteResponse);

      const result = await controller.create(
        createApplicationNoteDto,
        'user-123',
      );

      expect(service.create).toHaveBeenCalledWith(
        createApplicationNoteDto,
        'user-123',
      );
      expect(result).toEqual(mockApplicationNoteResponse);
    });
  });

  describe('findAll', () => {
    it('should return all application notes', async () => {
      service.findAll.mockResolvedValue([mockApplicationNoteResponse]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockApplicationNoteResponse]);
    });
  });

  describe('findByApplication', () => {
    it('should return notes for an application', async () => {
      const applicationId = '123e4567-e89b-12d3-a456-426614174000';
      service.findByApplication.mockResolvedValue([
        mockApplicationNoteResponse,
      ]);

      const result = await controller.findByApplication(applicationId);

      expect(service.findByApplication).toHaveBeenCalledWith(applicationId);
      expect(result).toEqual([mockApplicationNoteResponse]);
    });

    it('should return internal notes when internal=true', async () => {
      const applicationId = '123e4567-e89b-12d3-a456-426614174000';
      service.findInternalNotes.mockResolvedValue([
        mockApplicationNoteResponse,
      ]);

      const result = await controller.findByApplication(applicationId, true);

      expect(service.findInternalNotes).toHaveBeenCalledWith(applicationId);
      expect(result).toEqual([mockApplicationNoteResponse]);
    });

    it('should return external notes when internal=false', async () => {
      const applicationId = '123e4567-e89b-12d3-a456-426614174000';
      const externalNote = {
        ...mockApplicationNoteResponse,
        isInternal: false,
      };
      service.findExternalNotes.mockResolvedValue([externalNote]);

      const result = await controller.findByApplication(applicationId, false);

      expect(service.findExternalNotes).toHaveBeenCalledWith(applicationId);
      expect(result).toEqual([externalNote]);
    });
  });

  describe('findByUser', () => {
    it('should return notes by user', async () => {
      const userId = 'user-123';
      service.findByUser.mockResolvedValue([mockApplicationNoteResponse]);

      const result = await controller.findByUser(userId);

      expect(service.findByUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual([mockApplicationNoteResponse]);
    });
  });

  describe('findMyNotes', () => {
    it('should return current user notes', async () => {
      service.findByUser.mockResolvedValue([mockApplicationNoteResponse]);

      const result = await controller.findMyNotes('user-123');

      expect(service.findByUser).toHaveBeenCalledWith('user-123');
      expect(result).toEqual([mockApplicationNoteResponse]);
    });
  });

  describe('findOne', () => {
    it('should return an application note by id', async () => {
      const noteId = '123e4567-e89b-12d3-a456-426614174003';
      service.findOne.mockResolvedValue(mockApplicationNoteResponse);

      const result = await controller.findOne(noteId);

      expect(service.findOne).toHaveBeenCalledWith(noteId);
      expect(result).toEqual(mockApplicationNoteResponse);
    });
  });

  describe('update', () => {
    it('should update an application note', async () => {
      const noteId = '123e4567-e89b-12d3-a456-426614174003';
      const updateApplicationNoteDto: UpdateApplicationNoteDto = {
        note: 'Updated note',
      };
      const updatedResponse = {
        ...mockApplicationNoteResponse,
        note: 'Updated note',
      };

      service.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(
        noteId,
        updateApplicationNoteDto,
        'user-123',
      );

      expect(service.update).toHaveBeenCalledWith(
        noteId,
        updateApplicationNoteDto,
        'user-123',
      );
      expect(result).toEqual(updatedResponse);
    });
  });

  describe('remove', () => {
    it('should remove an application note', async () => {
      const noteId = '123e4567-e89b-12d3-a456-426614174003';
      service.remove.mockResolvedValue(undefined);

      await controller.remove(noteId, 'user-123');

      expect(service.remove).toHaveBeenCalledWith(noteId, 'user-123');
    });
  });
});
