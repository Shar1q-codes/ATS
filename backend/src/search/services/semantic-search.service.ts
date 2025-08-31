import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpenAI } from 'openai';
import { ConfigService } from '@nestjs/config';
import { Candidate } from '../../entities/candidate.entity';
import { JobFamily } from '../../entities/job-family.entity';
import { Application } from '../../entities/application.entity';

export interface SemanticSearchOptions {
  query: string;
  type: 'candidates' | 'jobs' | 'skills' | 'all';
  tenantId: string;
  limit?: number;
  threshold?: number; // Similarity threshold (0-1)
  includeExplanation?: boolean;
}

export interface SemanticSearchResult {
  id: string;
  type: 'candidate' | 'job' | 'skill';
  title: string;
  content: string;
  similarity: number;
  explanation?: string;
  metadata: Record<string, any>;
}

export interface CandidateRecommendation {
  candidate: Candidate;
  fitScore: number;
  explanation: string;
  matchedSkills: string[];
  missingSkills: string[];
  strengthAreas: string[];
}

export interface SkillSuggestion {
  skill: string;
  relevance: number;
  relatedSkills: string[];
  jobDemand: number;
}

@Injectable()
export class SemanticSearchService {
  private readonly logger = new Logger(SemanticSearchService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
    @InjectRepository(JobFamily)
    private readonly jobFamilyRepository: Repository<JobFamily>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async semanticSearch(
    options: SemanticSearchOptions,
  ): Promise<SemanticSearchResult[]> {
    try {
      const {
        query,
        type,
        tenantId,
        limit = 20,
        threshold = 0.7,
        includeExplanation = false,
      } = options;

      // Generate embedding for the search query
      const queryEmbedding = await this.generateEmbedding(query);

      // Perform vector similarity search
      const searchResults = await this.vectorSearch(
        queryEmbedding,
        type,
        tenantId,
        limit,
        threshold,
      );

      // Add explanations if requested
      if (includeExplanation) {
        for (const result of searchResults) {
          result.explanation = await this.generateSearchExplanation(
            query,
            result,
          );
        }
      }

      return searchResults;
    } catch (error) {
      this.logger.error('Semantic search failed', error);
      throw new Error('Semantic search operation failed');
    }
  }

  async recommendCandidates(
    jobRequirements: string[],
    tenantId: string,
    limit: number = 10,
  ): Promise<CandidateRecommendation[]> {
    try {
      // Generate embeddings for job requirements
      const requirementEmbeddings = await Promise.all(
        jobRequirements.map((req) => this.generateEmbedding(req)),
      );

      // Find candidates with similar skill embeddings
      const candidates = await this.findSimilarCandidates(
        requirementEmbeddings,
        tenantId,
        limit * 2, // Get more candidates for better filtering
      );

      // Score and rank candidates
      const recommendations: CandidateRecommendation[] = [];

      for (const candidate of candidates) {
        const recommendation = await this.scoreCandidateMatch(
          candidate,
          jobRequirements,
          requirementEmbeddings,
        );

        if (recommendation.fitScore >= 0.6) {
          // Only include candidates with decent fit
          recommendations.push(recommendation);
        }
      }

      // Sort by fit score and return top results
      return recommendations
        .sort((a, b) => b.fitScore - a.fitScore)
        .slice(0, limit);
    } catch (error) {
      this.logger.error('Candidate recommendation failed', error);
      return [];
    }
  }

  async expandQuery(query: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a search query expansion expert. Given a search query, provide 5-10 related terms, synonyms, and variations that would help find relevant candidates or jobs. Focus on:
            1. Technical skills and their variations
            2. Job titles and role variations
            3. Industry-specific terms
            4. Related technologies and frameworks
            
            Return only the expanded terms as a JSON array of strings.`,
          },
          {
            role: 'user',
            content: `Expand this search query: "${query}"`,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      const expandedTerms = JSON.parse(
        response.choices[0].message.content || '[]',
      );
      return Array.isArray(expandedTerms) ? expandedTerms : [];
    } catch (error) {
      this.logger.error('Query expansion failed', error);
      return [];
    }
  }

  async suggestSkills(
    currentSkills: string[],
    targetRole: string,
    tenantId: string,
  ): Promise<SkillSuggestion[]> {
    try {
      // Generate embeddings for current skills and target role
      const skillEmbeddings = await Promise.all(
        currentSkills.map((skill) => this.generateEmbedding(skill)),
      );
      const roleEmbedding = await this.generateEmbedding(targetRole);

      // Find skill gaps and suggestions
      const suggestions = await this.findSkillSuggestions(
        skillEmbeddings,
        roleEmbedding,
        currentSkills,
        tenantId,
      );

      return suggestions;
    } catch (error) {
      this.logger.error('Skill suggestion failed', error);
      return [];
    }
  }

  async optimizeSearchRanking(
    searchResults: any[],
    userBehavior: any,
    tenantId: string,
  ): Promise<any[]> {
    try {
      // Get user interaction data
      const interactionData = await this.getUserInteractionData(
        userBehavior.userId,
        tenantId,
      );

      // Apply machine learning-based ranking adjustments
      const rankedResults = await this.applyMLRanking(
        searchResults,
        interactionData,
      );

      return rankedResults;
    } catch (error) {
      this.logger.error('Search ranking optimization failed', error);
      return searchResults; // Return original results if optimization fails
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: text,
        dimensions: 1536, // Use smaller dimensions for better performance
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('Embedding generation failed', error);
      throw error;
    }
  }

  private async vectorSearch(
    queryEmbedding: number[],
    type: string,
    tenantId: string,
    limit: number,
    threshold: number,
  ): Promise<SemanticSearchResult[]> {
    const indices = this.getIndicesForType(type);

    const searchRequest = {
      index: indices,
      body: {
        query: {
          bool: {
            filter: [{ term: { tenant_id: tenantId } }],
            must: [
              {
                script_score: {
                  query: { match_all: {} },
                  script: {
                    source: `
                      if (doc['embedding'].size() == 0) {
                        return 0;
                      }
                      return cosineSimilarity(params.query_vector, 'embedding') + 1.0;
                    `,
                    params: {
                      query_vector: queryEmbedding,
                    },
                  },
                  min_score: threshold + 1.0, // Adjust for cosine similarity offset
                },
              },
            ],
          },
        },
        size: limit,
      },
    };

    const response = await this.elasticsearchService.search(searchRequest);
    const hits = response.body.hits?.hits || [];

    return hits.map((hit: any) => ({
      id: hit._id,
      type: this.mapIndexToType(hit._index),
      title: hit._source.title || hit._source.name || 'Untitled',
      content: hit._source.content || hit._source.description || '',
      similarity: hit._score - 1.0, // Remove cosine similarity offset
      metadata: hit._source,
    }));
  }

  private async findSimilarCandidates(
    requirementEmbeddings: number[][],
    tenantId: string,
    limit: number,
  ): Promise<Candidate[]> {
    // Average the requirement embeddings to create a composite query vector
    const avgEmbedding = this.averageEmbeddings(requirementEmbeddings);

    const searchRequest = {
      index: 'candidates',
      body: {
        query: {
          bool: {
            filter: [{ term: { tenant_id: tenantId } }],
            must: [
              {
                script_score: {
                  query: { match_all: {} },
                  script: {
                    source: `
                      if (doc['skill_embeddings'].size() == 0) {
                        return 0;
                      }
                      return cosineSimilarity(params.query_vector, 'skill_embeddings') + 1.0;
                    `,
                    params: {
                      query_vector: avgEmbedding,
                    },
                  },
                },
              },
            ],
          },
        },
        size: limit,
        _source: ['id'],
      },
    };

    const response = await this.elasticsearchService.search(searchRequest);
    const hits = response.body.hits?.hits || [];

    // Fetch full candidate data from database
    const candidateIds = hits.map((hit: any) => hit._source.id);
    return this.candidateRepository.find({
      where: { id: candidateIds as any },
      relations: ['parsedData'],
    });
  }

  private async scoreCandidateMatch(
    candidate: Candidate,
    jobRequirements: string[],
    requirementEmbeddings: number[][],
  ): Promise<CandidateRecommendation> {
    const candidateSkills =
      candidate.parsedData?.skills?.map((s) => s.name) || [];

    // Calculate skill matches using embeddings
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    let totalSimilarity = 0;

    for (let i = 0; i < jobRequirements.length; i++) {
      const requirement = jobRequirements[i];
      const reqEmbedding = requirementEmbeddings[i];

      let bestMatch = 0;
      let bestSkill = '';

      for (const skill of candidateSkills) {
        const skillEmbedding = await this.generateEmbedding(skill);
        const similarity = this.cosineSimilarity(reqEmbedding, skillEmbedding);

        if (similarity > bestMatch) {
          bestMatch = similarity;
          bestSkill = skill;
        }
      }

      if (bestMatch > 0.7) {
        matchedSkills.push(bestSkill);
        totalSimilarity += bestMatch;
      } else {
        missingSkills.push(requirement);
      }
    }

    const fitScore =
      jobRequirements.length > 0 ? totalSimilarity / jobRequirements.length : 0;

    // Generate explanation
    const explanation = await this.generateCandidateExplanation(
      candidate,
      jobRequirements,
      matchedSkills,
      missingSkills,
      fitScore,
    );

    // Identify strength areas
    const strengthAreas = await this.identifyStrengthAreas(
      candidate,
      matchedSkills,
    );

    return {
      candidate,
      fitScore,
      explanation,
      matchedSkills,
      missingSkills,
      strengthAreas,
    };
  }

  private async findSkillSuggestions(
    skillEmbeddings: number[][],
    roleEmbedding: number[],
    currentSkills: string[],
    tenantId: string,
  ): Promise<SkillSuggestion[]> {
    // This would typically involve:
    // 1. Finding skills commonly associated with the target role
    // 2. Identifying skill gaps based on successful candidates in similar roles
    // 3. Analyzing job market demand for skills

    // For now, return a simplified implementation
    const suggestions: SkillSuggestion[] = [];

    // Get job market data for the tenant
    const jobData = await this.getJobMarketData(tenantId);

    // Find skills that are in demand but not in current skill set
    for (const [skill, demand] of Object.entries(jobData.skillDemand)) {
      if (!currentSkills.includes(skill)) {
        const skillEmbedding = await this.generateEmbedding(skill);
        const relevance = this.cosineSimilarity(roleEmbedding, skillEmbedding);

        if (relevance > 0.6) {
          suggestions.push({
            skill,
            relevance,
            relatedSkills: jobData.relatedSkills[skill] || [],
            jobDemand: demand as number,
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
  }

  private async generateSearchExplanation(
    query: string,
    result: SemanticSearchResult,
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI search assistant. Explain why a search result is relevant to the user's query. Be concise and focus on the key matching elements.`,
          },
          {
            role: 'user',
            content: `Query: "${query}"
            Result: ${result.title} - ${result.content.substring(0, 200)}...
            Similarity Score: ${result.similarity.toFixed(2)}
            
            Explain why this result matches the query:`,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      });

      return response.choices[0].message.content || 'No explanation available';
    } catch (error) {
      this.logger.error('Search explanation generation failed', error);
      return 'Explanation not available';
    }
  }

  private async generateCandidateExplanation(
    candidate: Candidate,
    jobRequirements: string[],
    matchedSkills: string[],
    missingSkills: string[],
    fitScore: number,
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a recruitment AI assistant. Provide a concise explanation of why a candidate is a good fit for a job based on their skills and the job requirements.`,
          },
          {
            role: 'user',
            content: `Candidate: ${candidate.firstName} ${candidate.lastName}
            Job Requirements: ${jobRequirements.join(', ')}
            Matched Skills: ${matchedSkills.join(', ')}
            Missing Skills: ${missingSkills.join(', ')}
            Fit Score: ${(fitScore * 100).toFixed(1)}%
            
            Provide a brief explanation of the candidate's fit:`,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      return response.choices[0].message.content || 'No explanation available';
    } catch (error) {
      this.logger.error('Candidate explanation generation failed', error);
      return 'Explanation not available';
    }
  }

  private async identifyStrengthAreas(
    candidate: Candidate,
    matchedSkills: string[],
  ): Promise<string[]> {
    // Group skills by category/domain
    const skillCategories = await this.categorizeSkills(matchedSkills);

    // Return categories where candidate has multiple skills
    return Object.entries(skillCategories)
      .filter(([_, skills]) => (skills as string[]).length >= 2)
      .map(([category, _]) => category);
  }

  private async categorizeSkills(
    skills: string[],
  ): Promise<Record<string, string[]>> {
    // This would typically use a skill taxonomy or ML model
    // For now, return a simplified categorization
    const categories: Record<string, string[]> = {
      'Frontend Development': [],
      'Backend Development': [],
      Database: [],
      DevOps: [],
      'Mobile Development': [],
      'Data Science': [],
      Design: [],
    };

    const frontendSkills = [
      'JavaScript',
      'React',
      'Vue',
      'Angular',
      'HTML',
      'CSS',
      'TypeScript',
    ];
    const backendSkills = [
      'Node.js',
      'Python',
      'Java',
      'C#',
      'PHP',
      'Ruby',
      'Go',
    ];
    const databaseSkills = ['SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis'];
    const devopsSkills = [
      'Docker',
      'Kubernetes',
      'AWS',
      'Azure',
      'Jenkins',
      'Git',
    ];
    const mobileSkills = [
      'React Native',
      'Flutter',
      'iOS',
      'Android',
      'Swift',
      'Kotlin',
    ];
    const dataSkills = [
      'Python',
      'R',
      'Machine Learning',
      'TensorFlow',
      'Pandas',
      'NumPy',
    ];
    const designSkills = ['Figma', 'Sketch', 'Adobe', 'UI/UX', 'Photoshop'];

    skills.forEach((skill) => {
      if (
        frontendSkills.some((fs) =>
          skill.toLowerCase().includes(fs.toLowerCase()),
        )
      ) {
        categories['Frontend Development'].push(skill);
      }
      if (
        backendSkills.some((bs) =>
          skill.toLowerCase().includes(bs.toLowerCase()),
        )
      ) {
        categories['Backend Development'].push(skill);
      }
      if (
        databaseSkills.some((ds) =>
          skill.toLowerCase().includes(ds.toLowerCase()),
        )
      ) {
        categories['Database'].push(skill);
      }
      if (
        devopsSkills.some((dos) =>
          skill.toLowerCase().includes(dos.toLowerCase()),
        )
      ) {
        categories['DevOps'].push(skill);
      }
      if (
        mobileSkills.some((ms) =>
          skill.toLowerCase().includes(ms.toLowerCase()),
        )
      ) {
        categories['Mobile Development'].push(skill);
      }
      if (
        dataSkills.some((ds) => skill.toLowerCase().includes(ds.toLowerCase()))
      ) {
        categories['Data Science'].push(skill);
      }
      if (
        designSkills.some((ds) =>
          skill.toLowerCase().includes(ds.toLowerCase()),
        )
      ) {
        categories['Design'].push(skill);
      }
    });

    return categories;
  }

  private async getUserInteractionData(
    userId: string,
    tenantId: string,
  ): Promise<any> {
    // Get user's search and interaction history
    const searchHistory = await this.elasticsearchService.search({
      index: 'search_analytics',
      body: {
        query: {
          bool: {
            filter: [
              { term: { user_id: userId } },
              { term: { tenant_id: tenantId } },
              { range: { timestamp: { gte: 'now-30d' } } },
            ],
          },
        },
        aggs: {
          popular_queries: {
            terms: { field: 'query.keyword', size: 10 },
          },
          search_types: {
            terms: { field: 'search_type', size: 10 },
          },
        },
      },
    });

    return searchHistory.body.aggregations || {};
  }

  private async applyMLRanking(
    searchResults: any[],
    interactionData: any,
  ): Promise<any[]> {
    // Apply machine learning-based ranking adjustments
    // This would typically involve a trained model, but for now we'll use simple heuristics

    return searchResults
      .map((result) => ({
        ...result,
        adjustedScore:
          result.score * this.calculateRankingBoost(result, interactionData),
      }))
      .sort((a, b) => b.adjustedScore - a.adjustedScore);
  }

  private calculateRankingBoost(result: any, interactionData: any): number {
    let boost = 1.0;

    // Boost results that match user's frequent search types
    const popularTypes = interactionData.search_types?.buckets || [];
    const userPreferredType = popularTypes[0]?.key;

    if (result.type === userPreferredType) {
      boost *= 1.2;
    }

    // Boost results with higher engagement (this would come from click-through data)
    if (result.metadata.engagement_score > 0.8) {
      boost *= 1.1;
    }

    return boost;
  }

  private async getJobMarketData(tenantId: string): Promise<any> {
    // Analyze job postings and applications to understand skill demand
    const jobAnalysis = await this.elasticsearchService.search({
      index: 'jobs',
      body: {
        query: {
          bool: {
            filter: [{ term: { tenant_id: tenantId } }],
          },
        },
        aggs: {
          skill_demand: {
            terms: { field: 'skills.keyword', size: 50 },
          },
        },
      },
    });

    const skillDemand: Record<string, number> = {};
    const relatedSkills: Record<string, string[]> = {};

    const buckets = jobAnalysis.body.aggregations?.skill_demand?.buckets || [];
    buckets.forEach((bucket: any) => {
      skillDemand[bucket.key] = bucket.doc_count;
      // This would typically involve more sophisticated analysis
      relatedSkills[bucket.key] = [];
    });

    return { skillDemand, relatedSkills };
  }

  private getIndicesForType(type: string): string[] {
    const indexMap = {
      candidates: ['candidates'],
      jobs: ['jobs'],
      skills: ['candidates', 'jobs'], // Skills can be found in both
      all: ['candidates', 'jobs', 'applications', 'notes'],
    };

    return indexMap[type] || indexMap.all;
  }

  private mapIndexToType(index: string): 'candidate' | 'job' | 'skill' {
    const typeMap = {
      candidates: 'candidate' as const,
      jobs: 'job' as const,
      applications: 'candidate' as const, // Applications are candidate-related
      notes: 'candidate' as const, // Notes are candidate-related
    };

    return typeMap[index] || 'candidate';
  }

  private averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];

    const dimensions = embeddings[0].length;
    const avgEmbedding = new Array(dimensions).fill(0);

    embeddings.forEach((embedding) => {
      embedding.forEach((value, index) => {
        avgEmbedding[index] += value;
      });
    });

    return avgEmbedding.map((value) => value / embeddings.length);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
