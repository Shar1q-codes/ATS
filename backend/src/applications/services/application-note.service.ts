import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationNote } from '../../entities/application-note.entity';
import { Application } from '../../entities/application.entity';
import { CreateApplicationNoteDto } from '../dto/create-application-note.dto';
import { UpdateApplicationNoteDto } from '../dto/update-application-note.dto';
import { ApplicationNoteResponseDto } from '../dto/application-note-response.dto';

@Injectable()
export class ApplicationNoteService {
  constructor(
    @InjectRepository(ApplicationNote)
    private readonly applicationNoteRepository: Repository<ApplicationNote>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {}

  async create(
    createApplicationNoteDto: CreateApplicationNoteDto,
    userId: string,
  ): Promise<ApplicationNoteResponseDto> {
    // Verify application exists
    const application = await this.applicationRepository.findOne({
      where: { id: createApplicationNoteDto.applicationId },
    });

    if (!application) {
      throw new NotFoundException(
        `Application with ID ${createApplicationNoteDto.applicationId} not found`,
      );
    }

    const applicationNote = this.applicationNoteRepository.create({
      ...createApplicationNoteDto,
      userId,
    });

    const savedNote =
      await this.applicationNoteRepository.save(applicationNote);
    return this.toResponseDto(savedNote);
  }

  async findAll(): Promise<ApplicationNoteResponseDto[]> {
    const notes = await this.applicationNoteRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return notes.map((note) => this.toResponseDto(note));
  }

  async findByApplication(
    applicationId: string,
  ): Promise<ApplicationNoteResponseDto[]> {
    const notes = await this.applicationNoteRepository.find({
      where: { applicationId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return notes.map((note) => this.toResponseDto(note));
  }

  async findOne(id: string): Promise<ApplicationNoteResponseDto> {
    const note = await this.applicationNoteRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!note) {
      throw new NotFoundException(`Application note with ID ${id} not found`);
    }

    return this.toResponseDto(note);
  }

  async update(
    id: string,
    updateApplicationNoteDto: UpdateApplicationNoteDto,
    userId: string,
  ): Promise<ApplicationNoteResponseDto> {
    const note = await this.applicationNoteRepository.findOne({
      where: { id },
    });

    if (!note) {
      throw new NotFoundException(`Application note with ID ${id} not found`);
    }

    // Only allow the note creator to update their own notes
    if (note.userId !== userId) {
      throw new ForbiddenException(
        'You can only update your own application notes',
      );
    }

    Object.assign(note, updateApplicationNoteDto);
    const updatedNote = await this.applicationNoteRepository.save(note);

    return this.toResponseDto(updatedNote);
  }

  async remove(id: string, userId: string): Promise<void> {
    const note = await this.applicationNoteRepository.findOne({
      where: { id },
    });

    if (!note) {
      throw new NotFoundException(`Application note with ID ${id} not found`);
    }

    // Only allow the note creator to delete their own notes
    if (note.userId !== userId) {
      throw new ForbiddenException(
        'You can only delete your own application notes',
      );
    }

    await this.applicationNoteRepository.remove(note);
  }

  async findByUser(userId: string): Promise<ApplicationNoteResponseDto[]> {
    const notes = await this.applicationNoteRepository.find({
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return notes.map((note) => this.toResponseDto(note));
  }

  async findInternalNotes(
    applicationId: string,
  ): Promise<ApplicationNoteResponseDto[]> {
    const notes = await this.applicationNoteRepository.find({
      where: { applicationId, isInternal: true },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return notes.map((note) => this.toResponseDto(note));
  }

  async findExternalNotes(
    applicationId: string,
  ): Promise<ApplicationNoteResponseDto[]> {
    const notes = await this.applicationNoteRepository.find({
      where: { applicationId, isInternal: false },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return notes.map((note) => this.toResponseDto(note));
  }

  private toResponseDto(note: ApplicationNote): ApplicationNoteResponseDto {
    return {
      id: note.id,
      applicationId: note.applicationId,
      userId: note.userId,
      note: note.note,
      isInternal: note.isInternal,
      createdAt: note.createdAt,
      user: note.user,
    };
  }
}
