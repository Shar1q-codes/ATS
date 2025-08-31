import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmbeddingService } from './embedding.service';
import { VectorStorageService } from './vector-storage.service';
import { Candidate } from '../../entities/candidate.entity';
import { CompanyJobVariant } from '../../entities/company-job-variant.entity';
import {
  RequirementItem,
  RequirementCategory,
} from '../../entities/requirement-item.entity';
import {
  MatchExplanation,
  RequirementMatch,
} from '../../entities/match-explanation.entity';

export interface MatchResult {
  candidateId: string;
  jobVariantId: string;
  fitScore: number;
  breakdown: {
    mustHaveScore: number;
    shouldHaveScore: number;
    niceToHaveScore: number;
  };
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  detailedAnalysis: RequirementMatch[];
}

export interface MatchingOptions {
  includeExplanation?: boolean;
  minFitScore?: number;
  maxResults?: number;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private embeddingService: EmbeddingService,
    private vectorStorageService: VectorStorageService,
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
    @InjectRepository(CompanyJobVariant)
    private jobVariantRepository: Repository<CompanyJobVariant>,
    @InjectRepository(RequirementItem)
    private requirementRepository: Repository<RequirementItem>,
  ) {}

  /**
   * Match a single candidate against a job variant
   */
  async matchCandidateToJob(
    candidateId: string,
    jobVariantId: string,
    options: MatchingOptions = {},
  ): Promise<MatchResult> {
    try {
      this.logger.log(
        `Matching candidate ${candidateId} to job ${jobVariantId}`,
      );

      // Get candidate with parsed data
      const candidate = await this.candidateRepository.findOne({
        where: { id: candidateId },
        relations: ['parsedData'],
      });

      if (!candidate) {
        throw new Error(`Candidate ${candidateId} not found`);
      }

      // Get job variant with requirements
      const jobVariant = await this.jobVariantRepository.findOne({
        where: { id: jobVariantId },
        relations: [
          'requirements',
          'jobTemplate',
          'jobTemplate.requirements',
          'companyProfile',
        ],
      });

      if (!jobVariant) {
        throw new Error(`Job variant ${jobVariantId} not found`);
      }

      // Get all requirements for this job (template + variant specific)
      const allRequirements = await this.getAllJobRequirements(jobVariantId);

      // Calculate match score
      const matchResult = await this.calculateMatchScore(
        candidate,
        allRequirements,
      );

      return {
        candidateId,
        jobVariantId,
        ...matchResult,
      };
    } catch (error) {
      this.logger.error(`Error matching candidate to job: ${error.message}`);
      throw new Error(`Failed to match candidate to job: ${error.message}`);
    }
  }

  /**
   * Find best matching candidates for a job variant
   */
  async findMatchingCandidates(
    jobVariantId: string,
    options: MatchingOptions = {},
  ): Promise<MatchResult[]> {
    try {
      const { minFitScore = 60, maxResults = 50 } = options;

      this.logger.log(`Finding matching candidates for job ${jobVariantId}`);

      // Get job variant with requirements
      const jobVariant = await this.jobVariantRepository.findOne({
        where: { id: jobVariantId },
        relations: [
          'requirements',
          'jobTemplate',
          'jobTemplate.requirements',
          'companyProfile',
        ],
      });

      if (!jobVariant) {
        throw new Error(`Job variant ${jobVariantId} not found`);
      }

      // Get all requirements for this job
      const allRequirements = await this.getAllJobRequirements(jobVariantId);

      // Generate job embedding for vector similarity search
      const jobEmbedding = await this.generateJobEmbedding(
        allRequirements,
        jobVariant,
      );

      // Find similar candidates using vector search
      const similarCandidates =
        await this.vectorStorageService.findCandidatesForJob(
          jobEmbedding.embedding,
          jobVariantId,
          { limit: maxResults * 2, threshold: 0.5 }, // Get more candidates for detailed scoring
        );

      // Calculate detailed match scores for each candidate
      const matchResults: MatchResult[] = [];

      for (const candidateResult of similarCandidates) {
        const candidate = candidateResult.entity as Candidate;

        if (!candidate.parsedData) {
          // Load parsed data if not included
          const fullCandidate = await this.candidateRepository.findOne({
            where: { id: candidate.id },
            relations: ['parsedData'],
          });

          if (!fullCandidate?.parsedData) {
            continue;
          }

          candidate.parsedData = fullCandidate.parsedData;
        }

        const matchResult = await this.calculateMatchScore(
          candidate,
          allRequirements,
        );

        if (matchResult.fitScore >= minFitScore) {
          matchResults.push({
            candidateId: candidate.id,
            jobVariantId,
            ...matchResult,
          });
        }
      }

      // Sort by fit score (highest first) and limit results
      matchResults.sort((a, b) => b.fitScore - a.fitScore);
      const limitedResults = matchResults.slice(0, maxResults);

      this.logger.log(`Found ${limitedResults.length} matching candidates`);

      return limitedResults;
    } catch (error) {
      this.logger.error(`Error finding matching candidates: ${error.message}`);
      throw new Error(`Failed to find matching candidates: ${error.message}`);
    }
  }

  /**
   * Calculate detailed match score between candidate and requirements
   */
  private async calculateMatchScore(
    candidate: Candidate,
    requirements: RequirementItem[],
  ): Promise<Omit<MatchResult, 'candidateId' | 'jobVariantId'>> {
    // Group requirements by category
    const mustRequirements = requirements.filter(
      (r) => r.category === RequirementCategory.MUST,
    );
    const shouldRequirements = requirements.filter(
      (r) => r.category === RequirementCategory.SHOULD,
    );
    const niceRequirements = requirements.filter(
      (r) => r.category === RequirementCategory.NICE,
    );

    // Calculate scores for each category
    const mustHaveScore = await this.calculateCategoryScore(
      candidate,
      mustRequirements,
    );
    const shouldHaveScore = await this.calculateCategoryScore(
      candidate,
      shouldRequirements,
    );
    const niceToHaveScore = await this.calculateCategoryScore(
      candidate,
      niceRequirements,
    );

    // Calculate overall fit score with weighted categories
    const fitScore = this.calculateOverallFitScore(
      mustHaveScore,
      shouldHaveScore,
      niceToHaveScore,
    );

    // Generate detailed analysis for each requirement
    const detailedAnalysis = await this.generateDetailedAnalysis(
      candidate,
      requirements,
    );

    // Extract strengths, gaps, and recommendations
    const { strengths, gaps, recommendations } =
      this.extractInsights(detailedAnalysis);

    return {
      fitScore: Math.round(fitScore),
      breakdown: {
        mustHaveScore: Math.round(mustHaveScore),
        shouldHaveScore: Math.round(shouldHaveScore),
        niceToHaveScore: Math.round(niceToHaveScore),
      },
      strengths,
      gaps,
      recommendations,
      detailedAnalysis,
    };
  }

  /**
   * Calculate score for a specific category of requirements
   */
  private async calculateCategoryScore(
    candidate: Candidate,
    requirements: RequirementItem[],
  ): Promise<number> {
    if (requirements.length === 0) {
      return 100; // Perfect score if no requirements in this category
    }

    let totalScore = 0;
    let totalWeight = 0;

    for (const requirement of requirements) {
      const matchScore = await this.calculateRequirementMatch(
        candidate,
        requirement,
      );
      totalScore += matchScore * requirement.weight;
      totalWeight += requirement.weight;
    }

    return totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
  }

  /**
   * Calculate how well a candidate matches a specific requirement
   */
  private async calculateRequirementMatch(
    candidate: Candidate,
    requirement: RequirementItem,
  ): Promise<number> {
    const candidateText = this.buildCandidateSearchText(candidate);
    const requirementText = requirement.description;

    // Generate embeddings for semantic similarity
    const candidateEmbedding =
      await this.embeddingService.generateSkillEmbedding(candidateText);
    const requirementEmbedding =
      await this.embeddingService.generateSkillEmbedding(requirementText);

    // Calculate cosine similarity
    const similarity = this.vectorStorageService.calculateCosineSimilarity(
      candidateEmbedding.embedding,
      requirementEmbedding.embedding,
    );

    // Also check for exact keyword matches for higher confidence
    const keywordMatch = this.calculateKeywordMatch(
      candidateText,
      requirementText,
    );

    // Combine semantic similarity and keyword matching
    const combinedScore = Math.max(similarity, keywordMatch * 0.8); // Keyword match gets slight boost

    return Math.min(combinedScore, 1.0); // Ensure score doesn't exceed 1.0
  }

  /**
   * Calculate keyword-based matching score
   */
  private calculateKeywordMatch(
    candidateText: string,
    requirementText: string,
  ): number {
    const candidateWords = this.extractKeywords(candidateText.toLowerCase());
    const requirementWords = this.extractKeywords(
      requirementText.toLowerCase(),
    );

    if (requirementWords.length === 0) {
      return 0;
    }

    let matches = 0;
    for (const reqWord of requirementWords) {
      if (
        candidateWords.some(
          (candWord) =>
            candWord.includes(reqWord) ||
            reqWord.includes(candWord) ||
            this.calculateLevenshteinSimilarity(candWord, reqWord) > 0.8,
        )
      ) {
        matches++;
      }
    }

    return matches / requirementWords.length;
  }

  /**
   * Extract meaningful keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Remove common stop words and extract meaningful terms
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'must',
      'shall',
      'experience',
      'knowledge',
      'skills',
      'ability',
      'proficiency',
      'understanding',
    ]);

    return text
      .split(/\W+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .map((word) => word.toLowerCase());
  }

  /**
   * Calculate Levenshtein similarity between two strings
   */
  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;

    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator, // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate overall fit score from category scores
   */
  private calculateOverallFitScore(
    mustHaveScore: number,
    shouldHaveScore: number,
    niceToHaveScore: number,
  ): number {
    // Weighted scoring: MUST requirements are critical, SHOULD are important, NICE are bonus
    const mustWeight = 0.6;
    const shouldWeight = 0.3;
    const niceWeight = 0.1;

    return (
      mustHaveScore * mustWeight +
      shouldHaveScore * shouldWeight +
      niceToHaveScore * niceWeight
    );
  }

  /**
   * Generate detailed analysis for each requirement
   */
  private async generateDetailedAnalysis(
    candidate: Candidate,
    requirements: RequirementItem[],
  ): Promise<RequirementMatch[]> {
    const analysis: RequirementMatch[] = [];

    for (const requirement of requirements) {
      const matchScore = await this.calculateRequirementMatch(
        candidate,
        requirement,
      );
      const matched = matchScore >= 0.7; // Consider matched if 70% or higher
      const evidence = this.findEvidence(candidate, requirement);

      analysis.push({
        requirement,
        matched,
        confidence: matchScore,
        evidence,
        explanation: this.generateRequirementExplanation(
          requirement,
          matched,
          matchScore,
          evidence,
        ),
      });
    }

    return analysis;
  }

  /**
   * Find evidence in candidate profile for a requirement
   */
  private findEvidence(
    candidate: Candidate,
    requirement: RequirementItem,
  ): string[] {
    const evidence: string[] = [];
    const candidateText = this.buildCandidateSearchText(candidate);
    const requirementKeywords = this.extractKeywords(requirement.description);

    // Look for evidence in skills
    if (candidate.parsedData?.skills) {
      for (const skill of candidate.parsedData.skills) {
        if (
          requirementKeywords.some(
            (keyword) =>
              skill.name.toLowerCase().includes(keyword) ||
              keyword.includes(skill.name.toLowerCase()),
          )
        ) {
          evidence.push(
            `Skill: ${skill.name} (${skill.yearsOfExperience} years)`,
          );
        }
      }
    }

    // Look for evidence in experience
    if (candidate.parsedData?.experience) {
      for (const exp of candidate.parsedData.experience) {
        if (
          requirementKeywords.some(
            (keyword) =>
              exp.jobTitle.toLowerCase().includes(keyword) ||
              exp.description?.toLowerCase().includes(keyword),
          )
        ) {
          evidence.push(`Experience: ${exp.jobTitle} at ${exp.company}`);
        }
      }
    }

    // Look for evidence in education
    if (candidate.parsedData?.education) {
      for (const edu of candidate.parsedData.education) {
        if (
          requirementKeywords.some(
            (keyword) =>
              edu.degree.toLowerCase().includes(keyword) ||
              edu.fieldOfStudy?.toLowerCase().includes(keyword),
          )
        ) {
          evidence.push(`Education: ${edu.degree} in ${edu.fieldOfStudy}`);
        }
      }
    }

    return evidence.slice(0, 3); // Limit to top 3 pieces of evidence
  }

  /**
   * Generate explanation for a requirement match
   */
  private generateRequirementExplanation(
    requirement: RequirementItem,
    matched: boolean,
    confidence: number,
    evidence: string[],
  ): string {
    const confidencePercent = Math.round(confidence * 100);

    if (matched) {
      return `Strong match (${confidencePercent}% confidence) for "${requirement.description}". ${
        evidence.length > 0 ? `Evidence: ${evidence.join(', ')}.` : ''
      }`;
    } else {
      return `Partial match (${confidencePercent}% confidence) for "${requirement.description}". ${
        evidence.length > 0
          ? `Some relevant experience found: ${evidence.join(', ')}.`
          : 'No direct evidence found in candidate profile.'
      }`;
    }
  }

  /**
   * Extract insights from detailed analysis
   */
  private extractInsights(detailedAnalysis: RequirementMatch[]): {
    strengths: string[];
    gaps: string[];
    recommendations: string[];
  } {
    const strengths: string[] = [];
    const gaps: string[] = [];
    const recommendations: string[] = [];

    for (const analysis of detailedAnalysis) {
      if (analysis.matched && analysis.confidence >= 0.8) {
        strengths.push(`Strong in ${analysis.requirement.description}`);
      } else if (
        !analysis.matched &&
        analysis.requirement.category === RequirementCategory.MUST
      ) {
        gaps.push(`Missing: ${analysis.requirement.description}`);
        recommendations.push(
          `Consider training or certification in ${analysis.requirement.description}`,
        );
      } else if (analysis.confidence >= 0.5 && analysis.confidence < 0.7) {
        recommendations.push(
          `Could strengthen ${analysis.requirement.description} skills`,
        );
      }
    }

    return {
      strengths: strengths.slice(0, 5), // Top 5 strengths
      gaps: gaps.slice(0, 3), // Top 3 gaps
      recommendations: recommendations.slice(0, 3), // Top 3 recommendations
    };
  }

  /**
   * Build searchable text from candidate profile
   */
  private buildCandidateSearchText(candidate: Candidate): string {
    const parts: string[] = [];

    if (candidate.parsedData?.summary) {
      parts.push(candidate.parsedData.summary);
    }

    if (candidate.parsedData?.skills) {
      const skillNames = candidate.parsedData.skills.map((s) => s.name);
      parts.push(skillNames.join(', '));
    }

    if (candidate.parsedData?.experience) {
      const experienceText = candidate.parsedData.experience
        .map((exp) => `${exp.jobTitle} ${exp.description || ''}`)
        .join(' ');
      parts.push(experienceText);
    }

    if (candidate.parsedData?.education) {
      const educationText = candidate.parsedData.education
        .map((edu) => `${edu.degree} ${edu.fieldOfStudy || ''}`)
        .join(' ');
      parts.push(educationText);
    }

    return parts.join(' ');
  }

  /**
   * Generate job embedding for vector similarity search
   */
  private async generateJobEmbedding(
    requirements: RequirementItem[],
    jobVariant: CompanyJobVariant,
  ) {
    const requirementData = requirements.map((r) => ({
      description: r.description,
      type: r.type,
      category: r.category,
      weight: r.weight,
    }));

    return await this.embeddingService.generateJobRequirementsEmbedding(
      requirementData,
      jobVariant.customTitle || jobVariant.jobTemplate?.name,
      jobVariant.customDescription,
    );
  }

  /**
   * Get all requirements for a job variant (template + variant specific)
   */
  private async getAllJobRequirements(
    jobVariantId: string,
  ): Promise<RequirementItem[]> {
    // Get requirements directly associated with the job variant
    const variantRequirements = await this.requirementRepository.find({
      where: { companyJobVariantId: jobVariantId },
    });

    // Get the job variant to access template requirements
    const jobVariant = await this.jobVariantRepository.findOne({
      where: { id: jobVariantId },
      relations: ['jobTemplate'],
    });

    if (!jobVariant?.jobTemplate) {
      return variantRequirements;
    }

    // Get template requirements
    const templateRequirements = await this.requirementRepository.find({
      where: { jobTemplateId: jobVariant.jobTemplate.id },
    });

    // Combine and deduplicate requirements
    const allRequirements = [...templateRequirements, ...variantRequirements];

    // Remove duplicates based on description (variant requirements override template ones)
    const uniqueRequirements = new Map<string, RequirementItem>();

    for (const req of allRequirements) {
      uniqueRequirements.set(req.description, req);
    }

    return Array.from(uniqueRequirements.values());
  }
}
