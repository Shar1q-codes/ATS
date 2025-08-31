import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Application } from '../../entities/application.entity';
import { ApplicationNote } from '../../entities/application-note.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(ApplicationNote)
    private readonly applicationNoteRepository: Repository<ApplicationNote>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async authenticateSocket(client: Socket): Promise<User | null> {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn('No token provided for WebSocket connection');
        return null;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        select: ['id', 'email', 'firstName', 'lastName', 'role', 'tenantId'],
      });

      if (!user) {
        this.logger.warn(`User not found for token: ${payload.sub}`);
        return null;
      }

      return user;
    } catch (error) {
      this.logger.error('Socket authentication error:', error);
      return null;
    }
  }

  async verifyApplicationAccess(
    userId: string,
    applicationId: string,
    tenantId: string,
  ): Promise<boolean> {
    try {
      const application = await this.applicationRepository.findOne({
        where: {
          id: applicationId,
          tenantId,
        },
      });

      return !!application;
    } catch (error) {
      this.logger.error('Error verifying application access:', error);
      return false;
    }
  }

  async updateApplicationStage(
    applicationId: string,
    fromStage: string,
    toStage: string,
    userId: string,
    tenantId: string,
    notes?: string,
  ): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: {
        id: applicationId,
        tenantId,
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== fromStage) {
      throw new Error('Application stage mismatch');
    }

    // Update application stage
    application.status = toStage as any;
    application.lastUpdated = new Date();

    const updatedApplication =
      await this.applicationRepository.save(application);

    // Create stage history entry
    // Note: This would typically be handled by the ApplicationService
    // but for real-time updates, we're doing it here

    // Add note if provided
    if (notes) {
      await this.addApplicationNote(applicationId, notes, userId, tenantId);
    }

    return updatedApplication;
  }

  async addApplicationNote(
    applicationId: string,
    content: string,
    userId: string,
    tenantId: string,
    mentions?: string[],
  ): Promise<ApplicationNote> {
    // Verify application exists and user has access
    const application = await this.applicationRepository.findOne({
      where: {
        id: applicationId,
        tenantId,
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    const note = this.applicationNoteRepository.create({
      applicationId,
      content,
      authorId: userId,
      tenantId,
      mentions: mentions || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return await this.applicationNoteRepository.save(note);
  }

  async editApplicationNote(
    noteId: string,
    content: string,
    userId: string,
    tenantId: string,
    mentions?: string[],
  ): Promise<ApplicationNote> {
    const note = await this.applicationNoteRepository.findOne({
      where: {
        id: noteId,
        authorId: userId, // Only author can edit
        tenantId,
      },
    });

    if (!note) {
      throw new Error('Note not found or access denied');
    }

    note.content = content;
    note.mentions = mentions || [];
    note.updatedAt = new Date();

    return await this.applicationNoteRepository.save(note);
  }

  async getApplicationNotes(
    applicationId: string,
    tenantId: string,
  ): Promise<ApplicationNote[]> {
    return await this.applicationNoteRepository.find({
      where: {
        applicationId,
        tenantId,
      },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });
  }

  async deleteApplicationNote(
    noteId: string,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const note = await this.applicationNoteRepository.findOne({
      where: {
        id: noteId,
        authorId: userId, // Only author can delete
        tenantId,
      },
    });

    if (!note) {
      throw new Error('Note not found or access denied');
    }

    await this.applicationNoteRepository.remove(note);
  }
}
