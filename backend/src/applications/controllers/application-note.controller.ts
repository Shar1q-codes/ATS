import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Query,
  ParseBoolPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../entities/user.entity';
import { ApplicationNoteService } from '../services/application-note.service';
import { CreateApplicationNoteDto } from '../dto/create-application-note.dto';
import { UpdateApplicationNoteDto } from '../dto/update-application-note.dto';
import { ApplicationNoteResponseDto } from '../dto/application-note-response.dto';

@Controller('application-notes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationNoteController {
  constructor(
    private readonly applicationNoteService: ApplicationNoteService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createApplicationNoteDto: CreateApplicationNoteDto,
    @CurrentUser('id') userId: string,
  ): Promise<ApplicationNoteResponseDto> {
    return this.applicationNoteService.create(createApplicationNoteDto, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findAll(): Promise<ApplicationNoteResponseDto[]> {
    return this.applicationNoteService.findAll();
  }

  @Get('by-application/:applicationId')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findByApplication(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Query('internal', new ParseBoolPipe({ optional: true }))
    internal?: boolean,
  ): Promise<ApplicationNoteResponseDto[]> {
    if (internal === true) {
      return this.applicationNoteService.findInternalNotes(applicationId);
    } else if (internal === false) {
      return this.applicationNoteService.findExternalNotes(applicationId);
    }
    return this.applicationNoteService.findByApplication(applicationId);
  }

  @Get('by-user/:userId')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ApplicationNoteResponseDto[]> {
    return this.applicationNoteService.findByUser(userId);
  }

  @Get('my-notes')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findMyNotes(
    @CurrentUser('id') userId: string,
  ): Promise<ApplicationNoteResponseDto[]> {
    return this.applicationNoteService.findByUser(userId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApplicationNoteResponseDto> {
    return this.applicationNoteService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateApplicationNoteDto: UpdateApplicationNoteDto,
    @CurrentUser('id') userId: string,
  ): Promise<ApplicationNoteResponseDto> {
    return this.applicationNoteService.update(
      id,
      updateApplicationNoteDto,
      userId,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.applicationNoteService.remove(id, userId);
  }
}
