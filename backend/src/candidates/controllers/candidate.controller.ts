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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CandidateService } from '../services/candidate.service';
import { CreateCandidateDto } from '../dto/create-candidate.dto';
import { UpdateCandidateDto } from '../dto/update-candidate.dto';
import { CandidateResponseDto } from '../dto/candidate-response.dto';

@Controller('candidates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createCandidateDto: CreateCandidateDto,
  ): Promise<CandidateResponseDto> {
    return this.candidateService.create(createCandidateDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findAll(
    @Query('withoutConsent') withoutConsent?: string,
  ): Promise<CandidateResponseDto[]> {
    if (withoutConsent === 'true') {
      return this.candidateService.findCandidatesWithoutConsent();
    }
    return this.candidateService.findAll();
  }

  @Get('by-email/:email')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findByEmail(
    @Param('email') email: string,
  ): Promise<CandidateResponseDto | null> {
    return this.candidateService.findByEmail(email);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CandidateResponseDto> {
    return this.candidateService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCandidateDto: UpdateCandidateDto,
  ): Promise<CandidateResponseDto> {
    return this.candidateService.update(id, updateCandidateDto);
  }

  @Patch(':id/consent')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async updateConsent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('consentGiven') consentGiven: boolean,
  ): Promise<CandidateResponseDto> {
    return this.candidateService.updateConsent(id, consentGiven);
  }

  @Patch(':id/embeddings')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async updateSkillEmbeddings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('embeddings') embeddings: number[],
  ): Promise<CandidateResponseDto> {
    return this.candidateService.updateSkillEmbeddings(id, embeddings);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.candidateService.remove(id);
  }
}
