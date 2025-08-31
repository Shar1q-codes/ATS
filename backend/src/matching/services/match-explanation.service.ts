import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  MatchExplanation,
  RequirementMatch,
} from '../../entities/match-explanation.entity';
import { Candidate } from '../../entities/candidate.entity';
import { CompanyJobVariant } from '../../entities/company-job-variant.entity';
import { RequirementItem } from '../../entities/requirement-item.entity';
import { MatchResult } from './matching.service';

export interface ExplanationGenerationOptions {
  includeDetailedAnalysis?: boolean;
  includeRecommendations?: boolean;
  maxExplanationLength?: number;
}

@Injectable()
export class MatchExplanationService {
  private readonly logger = new Logger(MatchExplanationService.name);
  private openai: OpenAI;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor(
    private configService: ConfigService,
    @InjectRepository(MatchExplanation)
    private matchExplanationRepository: Repository<MatchExplanation>,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    this.openai = new OpenAI({
      apiKey,
    });
  }

  /**
   * Generate and store match explanation for an application
   */
  async generateMatchExplanation(
    applicationId: string,
    matchResult: MatchResult,
    candidate: Candidate,
    jobVariant: CompanyJobVariant,
    options: ExplanationGenerationOptions = {},
  ): Promise<MatchExplanation> {
    try {
      this.logger.log(
        `Generating match explanation for application ${applicationId}`,
      );

      // Generate AI-powered explanation
      const aiExplanation = await this.generateAIExplanation(
        matchResult,
        candidate,
        jobVariant,
        options,
      );

      // Create match explanation entity
      const matchExplanation = this.matchExplanationRepository.create({
        applicationId,
        overallScore: matchResult.fitScore,
        mustHaveScore: matchResult.breakdown.mustHaveScore,
        shouldHaveScore: matchResult.breakdown.shouldHaveScore,
        niceToHaveScore: matchResult.breakdown.niceToHaveScore,
        strengths: aiExplanation.strengths,
        gaps: aiExplanation.gaps,
        recommendations: aiExplanation.recommendations,
        detailedAnalysis: aiExplanation.detailedAnalysis,
      });

      // Save to database
      const savedExplanation =
        await this.matchExplanationRepository.save(matchExplanation);

      this.logger.log(
        `Successfully generated match explanation for application ${applicationId}`,
      );

      return savedExplanation;
    } catch (error) {
      this.logger.error(`Error generating match explanation: ${error.message}`);
      throw new Error(`Failed to generate match explanation: ${error.message}`);
    }
  }

  /**
   * Update existing match explanation
   */
  async updateMatchExplanation(
    applicationId: string,
    matchResult: MatchResult,
    candidate: Candidate,
    jobVariant: CompanyJobVariant,
    options: ExplanationGenerationOptions = {},
  ): Promise<MatchExplanation> {
    try {
      // Find existing explanation
      const existingExplanation = await this.matchExplanationRepository.findOne(
        {
          where: { applicationId },
        },
      );

      if (!existingExplanation) {
        // Create new if doesn't exist
        return await this.generateMatchExplanation(
          applicationId,
          matchResult,
          candidate,
          jobVariant,
          options,
        );
      }

      // Generate updated AI explanation
      const aiExplanation = await this.generateAIExplanation(
        matchResult,
        candidate,
        jobVariant,
        options,
      );

      // Update existing explanation
      existingExplanation.overallScore = matchResult.fitScore;
      existingExplanation.mustHaveScore = matchResult.breakdown.mustHaveScore;
      existingExplanation.shouldHaveScore =
        matchResult.breakdown.shouldHaveScore;
      existingExplanation.niceToHaveScore =
        matchResult.breakdown.niceToHaveScore;
      existingExplanation.strengths = aiExplanation.strengths;
      existingExplanation.gaps = aiExplanation.gaps;
      existingExplanation.recommendations = aiExplanation.recommendations;
      existingExplanation.detailedAnalysis = aiExplanation.detailedAnalysis;

      return await this.matchExplanationRepository.save(existingExplanation);
    } catch (error) {
      this.logger.error(`Error updating match explanation: ${error.message}`);
      throw new Error(`Failed to update match explanation: ${error.message}`);
    }
  }

  /**
   * Get match explanation by application ID
   */
  async getMatchExplanation(
    applicationId: string,
  ): Promise<MatchExplanation | null> {
    try {
      return await this.matchExplanationRepository.findOne({
        where: { applicationId },
        relations: ['application'],
      });
    } catch (error) {
      this.logger.error(`Error fetching match explanation: ${error.message}`);
      throw new Error(`Failed to fetch match explanation: ${error.message}`);
    }
  }

  /**
   * Delete match explanation
   */
  async deleteMatchExplanation(applicationId: string): Promise<void> {
    try {
      await this.matchExplanationRepository.delete({ applicationId });
      this.logger.log(
        `Deleted match explanation for application ${applicationId}`,
      );
    } catch (error) {
      this.logger.error(`Error deleting match explanation: ${error.message}`);
      throw new Error(`Failed to delete match explanation: ${error.message}`);
    }
  }

  /**
   * Generate AI-powered explanation using GPT-4o
   */
  private async generateAIExplanation(
    matchResult: MatchResult,
    candidate: Candidate,
    jobVariant: CompanyJobVariant,
    options: ExplanationGenerationOptions,
  ): Promise<{
    strengths: string[];
    gaps: string[];
    recommendations: string[];
    detailedAnalysis: RequirementMatch[];
  }> {
    try {
      // Build context for AI explanation
      const context = this.buildExplanationContext(
        matchResult,
        candidate,
        jobVariant,
      );

      // Generate explanation using GPT-4o
      const explanation = await this.callOpenAIForExplanation(context, options);

      // Enhance detailed analysis with AI insights
      const enhancedDetailedAnalysis = await this.enhanceDetailedAnalysis(
        matchResult.detailedAnalysis,
        candidate,
        jobVariant,
      );

      return {
        strengths: explanation.strengths,
        gaps: explanation.gaps,
        recommendations: explanation.recommendations,
        detailedAnalysis: enhancedDetailedAnalysis,
      };
    } catch (error) {
      this.logger.error(`Error generating AI explanation: ${error.message}`);
      // Fallback to basic explanation if AI fails
      return {
        strengths: matchResult.strengths,
        gaps: matchResult.gaps,
        recommendations: matchResult.recommendations,
        detailedAnalysis: matchResult.detailedAnalysis,
      };
    }
  }

  /**
   * Build context for AI explanation generation
   */
  private buildExplanationContext(
    matchResult: MatchResult,
    candidate: Candidate,
    jobVariant: CompanyJobVariant,
  ): string {
    const candidateProfile = this.buildCandidateProfile(candidate);
    const jobProfile = this.buildJobProfile(jobVariant);
    const matchSummary = this.buildMatchSummary(matchResult);

    return `
CANDIDATE PROFILE:
${candidateProfile}

JOB REQUIREMENTS:
${jobProfile}

MATCH ANALYSIS:
${matchSummary}

DETAILED REQUIREMENT ANALYSIS:
${matchResult.detailedAnalysis
  .map(
    (analysis) =>
      `- ${analysis.requirement.description} (${analysis.requirement.category.toUpperCase()}): ${
        analysis.matched ? 'MATCHED' : 'NOT MATCHED'
      } (${Math.round(analysis.confidence * 100)}% confidence)
  Evidence: ${analysis.evidence.join(', ') || 'None found'}`,
  )
  .join('\n')}
    `.trim();
  }

  /**
   * Build candidate profile summary
   */
  private buildCandidateProfile(candidate: Candidate): string {
    const parts: string[] = [];

    if (candidate.parsedData?.summary) {
      parts.push(`Summary: ${candidate.parsedData.summary}`);
    }

    if (candidate.parsedData?.totalExperience) {
      parts.push(
        `Total Experience: ${candidate.parsedData.totalExperience} years`,
      );
    }

    if (candidate.parsedData?.skills?.length) {
      const topSkills = candidate.parsedData.skills
        .slice(0, 10)
        .map((s) => `${s.name} (${s.yearsOfExperience}y)`)
        .join(', ');
      parts.push(`Key Skills: ${topSkills}`);
    }

    if (candidate.parsedData?.experience?.length) {
      const recentExperience = candidate.parsedData.experience
        .slice(0, 3)
        .map((exp) => `${exp.jobTitle} at ${exp.company}`)
        .join(', ');
      parts.push(`Recent Experience: ${recentExperience}`);
    }

    if (candidate.parsedData?.education?.length) {
      const education = candidate.parsedData.education
        .map((edu) => `${edu.degree} in ${edu.fieldOfStudy}`)
        .join(', ');
      parts.push(`Education: ${education}`);
    }

    return parts.join('\n');
  }

  /**
   * Build job profile summary
   */
  private buildJobProfile(jobVariant: CompanyJobVariant): string {
    const parts: string[] = [];

    if (jobVariant.customTitle || jobVariant.jobTemplate?.name) {
      parts.push(
        `Position: ${jobVariant.customTitle || jobVariant.jobTemplate?.name}`,
      );
    }

    if (jobVariant.customDescription) {
      parts.push(`Description: ${jobVariant.customDescription}`);
    }

    if (jobVariant.companyProfile?.name) {
      parts.push(`Company: ${jobVariant.companyProfile.name}`);
    }

    if (jobVariant.companyProfile?.industry) {
      parts.push(`Industry: ${jobVariant.companyProfile.industry}`);
    }

    return parts.join('\n');
  }

  /**
   * Build match summary
   */
  private buildMatchSummary(matchResult: MatchResult): string {
    return `
Overall Fit Score: ${matchResult.fitScore}%
- Must-Have Requirements: ${matchResult.breakdown.mustHaveScore}%
- Should-Have Requirements: ${matchResult.breakdown.shouldHaveScore}%
- Nice-to-Have Requirements: ${matchResult.breakdown.niceToHaveScore}%

Current Strengths: ${matchResult.strengths.join(', ')}
Current Gaps: ${matchResult.gaps.join(', ')}
Current Recommendations: ${matchResult.recommendations.join(', ')}
    `.trim();
  }

  /**
   * Call OpenAI API for explanation generation
   */
  private async callOpenAIForExplanation(
    context: string,
    options: ExplanationGenerationOptions,
  ): Promise<{
    strengths: string[];
    gaps: string[];
    recommendations: string[];
  }> {
    const prompt = `
You are an expert recruitment consultant analyzing a candidate-job match. Based on the provided context, generate a comprehensive, human-readable explanation of the match.

Your task is to:
1. Identify the candidate's key strengths relevant to this position
2. Highlight any significant gaps or missing requirements
3. Provide actionable recommendations for both the candidate and recruiter

Guidelines:
- Be specific and evidence-based in your analysis
- Focus on the most impactful strengths and gaps
- Provide practical, actionable recommendations
- Keep explanations clear and professional
- Limit to top 5 items per category
- Use positive, constructive language

Return your analysis in the following JSON format:
{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "gaps": ["gap 1", "gap 2", "gap 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}

Context:
${context}
`;

    const response = await this.callOpenAIWithRetry(async () => {
      return await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional recruitment consultant providing detailed candidate-job match analysis. Return only valid JSON with your analysis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: options.maxExplanationLength || 2000,
        temperature: 0.3, // Slightly creative but consistent
      });
    });

    const jsonResponse = response.choices[0]?.message?.content || '{}';

    try {
      const parsedResponse = JSON.parse(jsonResponse);
      return {
        strengths: Array.isArray(parsedResponse.strengths)
          ? parsedResponse.strengths.slice(0, 5)
          : [],
        gaps: Array.isArray(parsedResponse.gaps)
          ? parsedResponse.gaps.slice(0, 5)
          : [],
        recommendations: Array.isArray(parsedResponse.recommendations)
          ? parsedResponse.recommendations.slice(0, 5)
          : [],
      };
    } catch (parseError) {
      this.logger.error(
        'Failed to parse JSON response from OpenAI:',
        parseError,
      );
      // Return empty arrays as fallback
      return {
        strengths: [],
        gaps: [],
        recommendations: [],
      };
    }
  }

  /**
   * Enhance detailed analysis with AI insights
   */
  private async enhanceDetailedAnalysis(
    detailedAnalysis: RequirementMatch[],
    candidate: Candidate,
    jobVariant: CompanyJobVariant,
  ): Promise<RequirementMatch[]> {
    try {
      // For each requirement, enhance the explanation with AI insights
      const enhancedAnalysis: RequirementMatch[] = [];

      for (const analysis of detailedAnalysis) {
        const enhancedExplanation = await this.enhanceRequirementExplanation(
          analysis,
          candidate,
          jobVariant,
        );

        enhancedAnalysis.push({
          ...analysis,
          explanation: enhancedExplanation,
        });
      }

      return enhancedAnalysis;
    } catch (error) {
      this.logger.error(`Error enhancing detailed analysis: ${error.message}`);
      // Return original analysis if enhancement fails
      return detailedAnalysis;
    }
  }

  /**
   * Enhance individual requirement explanation
   */
  private async enhanceRequirementExplanation(
    analysis: RequirementMatch,
    candidate: Candidate,
    jobVariant: CompanyJobVariant,
  ): Promise<string> {
    try {
      const candidateContext = this.buildCandidateProfile(candidate);
      const requirement = analysis.requirement;

      const prompt = `
Analyze how well this candidate meets the specific job requirement and provide a detailed, professional explanation.

REQUIREMENT: ${requirement.description} (${requirement.category.toUpperCase()} requirement, weight: ${requirement.weight}/10)

CANDIDATE PROFILE:
${candidateContext}

CURRENT MATCH STATUS: ${analysis.matched ? 'MATCHED' : 'NOT MATCHED'} (${Math.round(analysis.confidence * 100)}% confidence)
EVIDENCE FOUND: ${analysis.evidence.join(', ') || 'None'}

Provide a detailed explanation (2-3 sentences) that:
1. Explains why this requirement is/isn't met
2. References specific evidence from the candidate's profile
3. Suggests how the candidate could strengthen this area if needed

Keep the explanation professional, specific, and actionable.
`;

      const response = await this.callOpenAIWithRetry(async () => {
        return await this.openai.chat.completions.create({
          model: 'gpt-4o-mini', // Use mini for cost efficiency on individual explanations
          messages: [
            {
              role: 'system',
              content:
                'You are a recruitment expert providing detailed requirement analysis. Be specific, professional, and constructive.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 200,
          temperature: 0.2,
        });
      });

      return (
        response.choices[0]?.message?.content || analysis.explanation
      ).trim();
    } catch (error) {
      this.logger.error(
        `Error enhancing requirement explanation: ${error.message}`,
      );
      // Return original explanation if enhancement fails
      return analysis.explanation;
    }
  }

  /**
   * Call OpenAI API with retry logic
   */
  private async callOpenAIWithRetry<T>(apiCall: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `OpenAI API call failed (attempt ${attempt}/${this.maxRetries}): ${error.message}`,
        );

        if (attempt < this.maxRetries) {
          // Check if it's a rate limit error
          if (error.status === 429) {
            const delay = this.retryDelay * Math.pow(2, attempt - 1);
            this.logger.log(`Rate limited, waiting ${delay}ms before retry`);
            await this.sleep(delay);
          } else {
            await this.sleep(this.retryDelay);
          }
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
