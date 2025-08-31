import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Logger,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import {
  MatchingService,
  MatchResult,
  MatchingOptions,
} from '../services/matching.service';

export class MatchCandidateDto {
  candidateId: string;
  jobVariantId: string;
  includeExplanation?: boolean;
}

export class FindMatchingCandidatesDto {
  minFitScore?: number;
  maxResults?: number;
  includeExplanation?: boolean;
}

@Controller('matching')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MatchingController {
  private readonly logger = new Logger(MatchingController.name);

  constructor(private matchingService: MatchingService) {}

  /**
   * Match a specific candidate to a job variant
   */
  @Post('candidate-to-job')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async matchCandidateToJob(@Body() dto: MatchCandidateDto): Promise<{
    success: boolean;
    data: MatchResult;
  }> {
    try {
      this.logger.log(
        `Matching candidate ${dto.candidateId} to job ${dto.jobVariantId}`,
      );

      const options: MatchingOptions = {
        includeExplanation: dto.includeExplanation ?? true,
      };

      const result = await this.matchingService.matchCandidateToJob(
        dto.candidateId,
        dto.jobVariantId,
        options,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Error matching candidate to job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find matching candidates for a job variant
   */
  @Get('job/:jobVariantId/candidates')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async findMatchingCandidates(
    @Param('jobVariantId', ParseUUIDPipe) jobVariantId: string,
    @Query('minFitScore', new DefaultValuePipe(60), ParseIntPipe)
    minFitScore: number,
    @Query('maxResults', new DefaultValuePipe(50), ParseIntPipe)
    maxResults: number,
    @Query('includeExplanation', new DefaultValuePipe(true))
    includeExplanation: boolean,
  ): Promise<{
    success: boolean;
    data: MatchResult[];
    meta: {
      total: number;
      minFitScore: number;
      maxResults: number;
    };
  }> {
    try {
      this.logger.log(`Finding matching candidates for job ${jobVariantId}`);

      const options: MatchingOptions = {
        minFitScore,
        maxResults,
        includeExplanation,
      };

      const results = await this.matchingService.findMatchingCandidates(
        jobVariantId,
        options,
      );

      return {
        success: true,
        data: results,
        meta: {
          total: results.length,
          minFitScore,
          maxResults,
        },
      };
    } catch (error) {
      this.logger.error(`Error finding matching candidates: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get match score for a specific candidate-job pair
   */
  @Get('candidate/:candidateId/job/:jobVariantId/score')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async getMatchScore(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
    @Param('jobVariantId', ParseUUIDPipe) jobVariantId: string,
  ): Promise<{
    success: boolean;
    data: {
      fitScore: number;
      breakdown: {
        mustHaveScore: number;
        shouldHaveScore: number;
        niceToHaveScore: number;
      };
    };
  }> {
    try {
      this.logger.log(
        `Getting match score for candidate ${candidateId} and job ${jobVariantId}`,
      );

      const result = await this.matchingService.matchCandidateToJob(
        candidateId,
        jobVariantId,
        { includeExplanation: false },
      );

      return {
        success: true,
        data: {
          fitScore: result.fitScore,
          breakdown: result.breakdown,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting match score: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get detailed match explanation for a candidate-job pair
   */
  @Get('candidate/:candidateId/job/:jobVariantId/explanation')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async getMatchExplanation(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
    @Param('jobVariantId', ParseUUIDPipe) jobVariantId: string,
  ): Promise<{
    success: boolean;
    data: {
      fitScore: number;
      breakdown: {
        mustHaveScore: number;
        shouldHaveScore: number;
        niceToHaveScore: number;
      };
      strengths: string[];
      gaps: string[];
      recommendations: string[];
      detailedAnalysis: any[];
    };
  }> {
    try {
      this.logger.log(
        `Getting match explanation for candidate ${candidateId} and job ${jobVariantId}`,
      );

      const result = await this.matchingService.matchCandidateToJob(
        candidateId,
        jobVariantId,
        { includeExplanation: true },
      );

      return {
        success: true,
        data: {
          fitScore: result.fitScore,
          breakdown: result.breakdown,
          strengths: result.strengths,
          gaps: result.gaps,
          recommendations: result.recommendations,
          detailedAnalysis: result.detailedAnalysis,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting match explanation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Batch match multiple candidates to a job
   */
  @Post('job/:jobVariantId/batch-match')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async batchMatchCandidates(
    @Param('jobVariantId', ParseUUIDPipe) jobVariantId: string,
    @Body() dto: { candidateIds: string[]; includeExplanation?: boolean },
  ): Promise<{
    success: boolean;
    data: MatchResult[];
    meta: {
      total: number;
      processed: number;
      failed: number;
    };
  }> {
    try {
      this.logger.log(
        `Batch matching ${dto.candidateIds.length} candidates to job ${jobVariantId}`,
      );

      const results: MatchResult[] = [];
      let processed = 0;
      let failed = 0;

      const options: MatchingOptions = {
        includeExplanation: dto.includeExplanation ?? false,
      };

      // Process candidates in parallel with limited concurrency
      const batchSize = 5;
      for (let i = 0; i < dto.candidateIds.length; i += batchSize) {
        const batch = dto.candidateIds.slice(i, i + batchSize);

        const batchPromises = batch.map(async (candidateId) => {
          try {
            const result = await this.matchingService.matchCandidateToJob(
              candidateId,
              jobVariantId,
              options,
            );
            processed++;
            return result;
          } catch (error) {
            this.logger.warn(
              `Failed to match candidate ${candidateId}: ${error.message}`,
            );
            failed++;
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter((result) => result !== null));
      }

      // Sort by fit score (highest first)
      results.sort((a, b) => b.fitScore - a.fitScore);

      return {
        success: true,
        data: results,
        meta: {
          total: dto.candidateIds.length,
          processed,
          failed,
        },
      };
    } catch (error) {
      this.logger.error(`Error in batch matching: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get matching statistics for a job variant
   */
  @Get('job/:jobVariantId/stats')
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  async getMatchingStats(
    @Param('jobVariantId', ParseUUIDPipe) jobVariantId: string,
  ): Promise<{
    success: boolean;
    data: {
      totalCandidates: number;
      candidatesWithEmbeddings: number;
      averageFitScore: number;
      scoreDistribution: {
        excellent: number; // 90-100
        good: number; // 70-89
        fair: number; // 50-69
        poor: number; // 0-49
      };
    };
  }> {
    try {
      this.logger.log(`Getting matching statistics for job ${jobVariantId}`);

      // Get matching candidates with a low threshold to get all potential matches
      const allMatches = await this.matchingService.findMatchingCandidates(
        jobVariantId,
        { minFitScore: 0, maxResults: 1000, includeExplanation: false },
      );

      // Get embedding statistics
      const embeddingStats =
        await this.matchingService['vectorStorageService'].getEmbeddingStats();

      // Calculate score distribution
      const scoreDistribution = {
        excellent: allMatches.filter((m) => m.fitScore >= 90).length,
        good: allMatches.filter((m) => m.fitScore >= 70 && m.fitScore < 90)
          .length,
        fair: allMatches.filter((m) => m.fitScore >= 50 && m.fitScore < 70)
          .length,
        poor: allMatches.filter((m) => m.fitScore < 50).length,
      };

      // Calculate average fit score
      const averageFitScore =
        allMatches.length > 0
          ? allMatches.reduce((sum, match) => sum + match.fitScore, 0) /
            allMatches.length
          : 0;

      return {
        success: true,
        data: {
          totalCandidates: embeddingStats.totalCandidates,
          candidatesWithEmbeddings: embeddingStats.candidatesWithEmbeddings,
          averageFitScore: Math.round(averageFitScore * 100) / 100,
          scoreDistribution,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting matching statistics: ${error.message}`);
      throw error;
    }
  }
}
