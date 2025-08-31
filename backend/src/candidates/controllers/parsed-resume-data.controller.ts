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
import { ParsedResumeDataService } from '../services/parsed-resume-data.service';
import { CreateParsedResumeDataDto } from '../dto/create-parsed-resume-data.dto';
import { UpdateParsedResumeDataDto } from '../dto/update-parsed-resume-data.dto';
import { ParsedResumeDataResponseDto } from '../dto/parsed-resume-data-response.dto';
import { Skill } from '../../entities/parsed-resume-data.entity';

@Controller('parsed-resume-data')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParsedResumeDataController {
  constructor(
    private readonly parsedResumeDataService: ParsedResumeDataService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createParsedResumeDataDto: CreateParsedResumeDataDto,
  ): Promise<ParsedResumeDataResponseDto> {
    return this.parsedResumeDataService.create(createParsedResumeDataDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findAll(): Promise<ParsedResumeDataResponseDto[]> {
    return this.parsedResumeDataService.findAll();
  }

  @Get('by-candidate/:candidateId')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findByCandidateId(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
  ): Promise<ParsedResumeDataResponseDto | null> {
    return this.parsedResumeDataService.findByCandidateId(candidateId);
  }

  @Get(':id/skills-by-category')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async getSkillsByCategory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ [category: string]: Skill[] }> {
    // First get the parsed resume data to get the candidate ID
    const parsedData = await this.parsedResumeDataService.findOne(id);
    return this.parsedResumeDataService.getSkillsByCategory(
      parsedData.candidateId,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ParsedResumeDataResponseDto> {
    return this.parsedResumeDataService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateParsedResumeDataDto: UpdateParsedResumeDataDto,
  ): Promise<ParsedResumeDataResponseDto> {
    return this.parsedResumeDataService.update(id, updateParsedResumeDataDto);
  }

  @Patch(':id/skills/:skillName/proficiency')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async updateSkillProficiency(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('skillName') skillName: string,
    @Body('proficiency') proficiency: number,
  ): Promise<ParsedResumeDataResponseDto> {
    return this.parsedResumeDataService.updateSkillProficiency(
      id,
      skillName,
      proficiency,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.parsedResumeDataService.remove(id);
  }
}
