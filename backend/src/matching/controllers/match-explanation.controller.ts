import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpStatus,
  HttpException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { MatchExplanationService } from '../services/match-explanation.service';
import { MatchingService } from '../services/matching.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Candidate } from '../../entities/candidate.entity';
import { CompanyJobVariant } from '../../entities/company-job-variant.entity';
import { Application } from '../../entities/application.entity';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class GenerateExplanationDto {
  @IsString()
  applicationId: string;

  @IsOptional()
  @IsBoolean()
  includeDetailedAnalysis?: boolean;

  @IsOptional()
  @IsBoolean()
  includeRecommendations?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(500)
  @Max(4000)
  maxExplanationLength?: number;
}

export class UpdateExplanationDto {
  @IsOptional()
  @IsBoolean()
  includeDetailedAnalysis?: boolean;

  @IsOptional()
  @IsBoolean()
  includeRecommendations?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(500)
  @Max(4000)
  maxExplanationLength?: number;
}

@Controller('match-explanations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MatchExplanationController {
  private readonly logger = new Logger(MatchExplanationController.name);

  constructor(
    private matchExplanationService: MatchExplanationService,
    private matchingService: MatchingService,
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
    @InjectRepository(CompanyJobVariant)
    private jobVariantRepository: Repository<CompanyJobVariant>,
  ) {}

  /**
   * Generate match explanation for an application
   */
  @Post('generate')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async generateExplanation(@Body() dto: GenerateExplanationDto) {
    try {
      this.logger.log(
        `Generating match explanation for application ${dto.applicationId}`,
      );

      // Get application with relations
      const application = await this.applicationRepository.findOne({
        where: { id: dto.applicationId },
        relations: ['candidate', 'candidate.parsedData', 'companyJobVariant'],
      });

      if (!application) {
        throw new HttpException(
          `Application ${dto.applicationId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Get job variant with full relations
      const jobVariant = await this.jobVariantRepository.findOne({
        where: { id: application.companyJobVariant.id },
        relations: [
          'requirements',
          'jobTemplate',
          'jobTemplate.requirements',
          'companyProfile',
        ],
      });

      if (!jobVariant) {
        throw new HttpException('Job variant not found', HttpStatus.NOT_FOUND);
      }

      // Generate fresh match result
      const matchResult = await this.matchingService.matchCandidateToJob(
        application.candidate.id,
        jobVariant.id,
        { includeExplanation: true },
      );

      // Generate explanation
      const explanation =
        await this.matchExplanationService.generateMatchExplanation(
          dto.applicationId,
          matchResult,
          application.candidate,
          jobVariant,
          {
            includeDetailedAnalysis: dto.includeDetailedAnalysis ?? true,
            includeRecommendations: dto.includeRecommendations ?? true,
            maxExplanationLength: dto.maxExplanationLength,
          },
        );

      this.logger.log(
        `Successfully generated match explanation for application ${dto.applicationId}`,
      );

      return {
        success: true,
        data: explanation,
        message: 'Match explanation generated successfully',
      };
    } catch (error) {
      this.logger.error(`Error generating match explanation: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to generate match explanation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get match explanation by application ID
   */
  @Get('application/:applicationId')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async getExplanationByApplication(
    @Param('applicationId') applicationId: string,
  ) {
    try {
      const explanation =
        await this.matchExplanationService.getMatchExplanation(applicationId);

      if (!explanation) {
        throw new HttpException(
          'Match explanation not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: explanation,
      };
    } catch (error) {
      this.logger.error(`Error fetching match explanation: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to fetch match explanation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update existing match explanation
   */
  @Put('application/:applicationId')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async updateExplanation(
    @Param('applicationId') applicationId: string,
    @Body() dto: UpdateExplanationDto,
  ) {
    try {
      this.logger.log(
        `Updating match explanation for application ${applicationId}`,
      );

      // Get application with relations
      const application = await this.applicationRepository.findOne({
        where: { id: applicationId },
        relations: ['candidate', 'candidate.parsedData', 'companyJobVariant'],
      });

      if (!application) {
        throw new HttpException(
          `Application ${applicationId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Get job variant with full relations
      const jobVariant = await this.jobVariantRepository.findOne({
        where: { id: application.companyJobVariant.id },
        relations: [
          'requirements',
          'jobTemplate',
          'jobTemplate.requirements',
          'companyProfile',
        ],
      });

      if (!jobVariant) {
        throw new HttpException('Job variant not found', HttpStatus.NOT_FOUND);
      }

      // Generate fresh match result
      const matchResult = await this.matchingService.matchCandidateToJob(
        application.candidate.id,
        jobVariant.id,
        { includeExplanation: true },
      );

      // Update explanation
      const explanation =
        await this.matchExplanationService.updateMatchExplanation(
          applicationId,
          matchResult,
          application.candidate,
          jobVariant,
          {
            includeDetailedAnalysis: dto.includeDetailedAnalysis ?? true,
            includeRecommendations: dto.includeRecommendations ?? true,
            maxExplanationLength: dto.maxExplanationLength,
          },
        );

      this.logger.log(
        `Successfully updated match explanation for application ${applicationId}`,
      );

      return {
        success: true,
        data: explanation,
        message: 'Match explanation updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error updating match explanation: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to update match explanation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete match explanation
   */
  @Delete('application/:applicationId')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async deleteExplanation(@Param('applicationId') applicationId: string) {
    try {
      // Check if explanation exists
      const explanation =
        await this.matchExplanationService.getMatchExplanation(applicationId);

      if (!explanation) {
        throw new HttpException(
          'Match explanation not found',
          HttpStatus.NOT_FOUND,
        );
      }

      await this.matchExplanationService.deleteMatchExplanation(applicationId);

      this.logger.log(
        `Successfully deleted match explanation for application ${applicationId}`,
      );

      return {
        success: true,
        message: 'Match explanation deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Error deleting match explanation: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to delete match explanation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Regenerate explanation for multiple applications (batch operation)
   */
  @Post('batch-regenerate')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER)
  async batchRegenerateExplanations(
    @Body() body: { applicationIds: string[]; options?: UpdateExplanationDto },
  ) {
    try {
      const { applicationIds, options = {} } = body;

      if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
        throw new HttpException(
          'Application IDs array is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (applicationIds.length > 50) {
        throw new HttpException(
          'Maximum 50 applications can be processed at once',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(
        `Batch regenerating explanations for ${applicationIds.length} applications`,
      );

      const results = [];
      const errors = [];

      for (const applicationId of applicationIds) {
        try {
          // Get application with relations
          const application = await this.applicationRepository.findOne({
            where: { id: applicationId },
            relations: [
              'candidate',
              'candidate.parsedData',
              'companyJobVariant',
            ],
          });

          if (!application) {
            errors.push({
              applicationId,
              error: 'Application not found',
            });
            continue;
          }

          // Get job variant with full relations
          const jobVariant = await this.jobVariantRepository.findOne({
            where: { id: application.companyJobVariant.id },
            relations: [
              'requirements',
              'jobTemplate',
              'jobTemplate.requirements',
              'companyProfile',
            ],
          });

          if (!jobVariant) {
            errors.push({
              applicationId,
              error: 'Job variant not found',
            });
            continue;
          }

          // Generate fresh match result
          const matchResult = await this.matchingService.matchCandidateToJob(
            application.candidate.id,
            jobVariant.id,
            { includeExplanation: true },
          );

          // Update explanation
          const explanation =
            await this.matchExplanationService.updateMatchExplanation(
              applicationId,
              matchResult,
              application.candidate,
              jobVariant,
              {
                includeDetailedAnalysis:
                  options.includeDetailedAnalysis ?? true,
                includeRecommendations: options.includeRecommendations ?? true,
                maxExplanationLength: options.maxExplanationLength,
              },
            );

          results.push({
            applicationId,
            success: true,
            explanationId: explanation.id,
          });
        } catch (error) {
          errors.push({
            applicationId,
            error: error.message,
          });
        }
      }

      this.logger.log(
        `Batch regeneration completed: ${results.length} successful, ${errors.length} failed`,
      );

      return {
        success: true,
        data: {
          successful: results,
          failed: errors,
          summary: {
            total: applicationIds.length,
            successful: results.length,
            failed: errors.length,
          },
        },
        message: `Batch regeneration completed: ${results.length}/${applicationIds.length} successful`,
      };
    } catch (error) {
      this.logger.error(`Error in batch regeneration: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to batch regenerate explanations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
