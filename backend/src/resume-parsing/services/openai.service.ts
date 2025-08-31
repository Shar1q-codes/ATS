import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIOptimizationService } from '../../common/performance/openai-optimization.service';
import OpenAI from 'openai';

export interface ParsedResumeContent {
  skills: string[];
  experience: WorkExperience[];
  education: Education[];
  certifications: string[];
  summary?: string;
  totalExperience: number;
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
  };
}

export interface WorkExperience {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  description: string;
  technologies?: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  graduationYear?: number;
  gpa?: string;
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(
    private configService: ConfigService,
    private openaiOptimization: OpenAIOptimizationService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    this.openai = new OpenAI({
      apiKey,
    });
  }

  async extractTextFromPDF(buffer: Buffer, filename: string): Promise<string> {
    try {
      this.logger.log(`Extracting text from PDF: ${filename}`);

      // Convert buffer to base64 for OpenAI
      const base64 = buffer.toString('base64');
      const dataUrl = `data:application/pdf;base64,${base64}`;

      // Generate cache key for PDF extraction
      const cacheKey = this.openaiOptimization.generateCacheKey(
        'pdf_extract',
        filename,
        buffer.toString('base64').substring(0, 100), // Use first 100 chars of base64 for cache key
      );

      const response = await this.openaiOptimization.chatCompletion(
        'gpt-4o',
        [
          {
            role: 'system',
            content: `You are a text extraction specialist. Extract all text content from the provided PDF document. 
            Return only the extracted text without any additional formatting or commentary.
            Preserve the structure and formatting as much as possible.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract all text from this PDF document:',
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                },
              },
            ],
          },
        ],
        {
          maxTokens: 4000,
          temperature: 0,
          cacheKey,
          cacheTTL: 86400, // Cache for 24 hours
        },
      );

      const extractedText = response.choices[0]?.message?.content || '';
      this.logger.log(
        `Successfully extracted ${extractedText.length} characters from PDF`,
      );

      return extractedText;
    } catch (error) {
      this.logger.error(`Error extracting text from PDF: ${error.message}`);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  async extractTextFromDOCX(buffer: Buffer, filename: string): Promise<string> {
    try {
      this.logger.log(`Extracting text from DOCX: ${filename}`);

      // Convert buffer to base64 for OpenAI
      const base64 = buffer.toString('base64');
      const dataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;

      const response = await this.callOpenAIWithRetry(async () => {
        return await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a text extraction specialist. Extract all text content from the provided DOCX document. 
              Return only the extracted text without any additional formatting or commentary.
              Preserve the structure and formatting as much as possible.`,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please extract all text from this DOCX document:',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: dataUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: 4000,
          temperature: 0,
        });
      });

      const extractedText = response.choices[0]?.message?.content || '';
      this.logger.log(
        `Successfully extracted ${extractedText.length} characters from DOCX`,
      );

      return extractedText;
    } catch (error) {
      this.logger.error(`Error extracting text from DOCX: ${error.message}`);
      throw new Error(`Failed to extract text from DOCX: ${error.message}`);
    }
  }

  async extractTextFromImage(
    buffer: Buffer,
    filename: string,
  ): Promise<string> {
    try {
      this.logger.log(`Extracting text from image: ${filename}`);

      // Determine image type from buffer
      const imageType = this.getImageMimeType(buffer);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${imageType};base64,${base64}`;

      const response = await this.callOpenAIWithRetry(async () => {
        return await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an OCR specialist. Extract all text content from the provided image. 
              This image contains a resume or CV document.
              Return only the extracted text without any additional formatting or commentary.
              Preserve the structure and formatting as much as possible.`,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please extract all text from this image:',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: dataUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: 4000,
          temperature: 0,
        });
      });

      const extractedText = response.choices[0]?.message?.content || '';
      this.logger.log(
        `Successfully extracted ${extractedText.length} characters from image`,
      );

      return extractedText;
    } catch (error) {
      this.logger.error(`Error extracting text from image: ${error.message}`);
      throw new Error(`Failed to extract text from image: ${error.message}`);
    }
  }

  async parseStructuredData(text: string): Promise<ParsedResumeContent> {
    try {
      this.logger.log('Parsing structured data from resume text');

      const prompt = `
You are a resume parsing specialist. Parse the following resume text and extract structured information.
Return the data in the exact JSON format specified below. Be thorough and accurate.

IMPORTANT: Return ONLY valid JSON, no additional text or formatting.

Expected JSON format:
{
  "personalInfo": {
    "name": "string or null",
    "email": "string or null", 
    "phone": "string or null",
    "location": "string or null",
    "linkedinUrl": "string or null",
    "portfolioUrl": "string or null"
  },
  "summary": "string or null",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {
      "company": "Company Name",
      "position": "Job Title",
      "startDate": "YYYY-MM or YYYY",
      "endDate": "YYYY-MM or YYYY or null for current",
      "description": "Job description and achievements",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "education": [
    {
      "institution": "University/School Name",
      "degree": "Degree Type",
      "field": "Field of Study",
      "graduationYear": 2023,
      "gpa": "3.8 or null"
    }
  ],
  "certifications": ["cert1", "cert2"],
  "totalExperience": 5
}

Guidelines:
- Extract skills from throughout the resume, including technical skills, soft skills, and tools
- Calculate totalExperience as the sum of all work experience in years
- For dates, use YYYY-MM format when month is available, otherwise YYYY
- Include all relevant work experience, internships, and projects
- Extract education information including degrees, certifications, and courses
- Be comprehensive but accurate - don't hallucinate information not present in the text

Resume text to parse:
${text}
`;

      // Generate cache key for structured parsing
      const cacheKey = this.openaiOptimization.generateCacheKey(
        'resume_parse',
        text.substring(0, 200), // Use first 200 chars for cache key
      );

      const response = await this.openaiOptimization.chatCompletion(
        'gpt-4o-mini', // Use cheaper model for parsing
        [
          {
            role: 'system',
            content:
              'You are a precise resume parsing assistant. Return only valid JSON with the extracted information.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        {
          maxTokens: 3000,
          temperature: 0,
          cacheKey,
          cacheTTL: 3600, // Cache for 1 hour
        },
      );

      const jsonResponse = response.choices[0]?.message?.content || '{}';

      try {
        const parsedData = JSON.parse(jsonResponse);
        this.logger.log('Successfully parsed structured data from resume');

        // Validate and clean the parsed data
        return this.validateAndCleanParsedData(parsedData);
      } catch (parseError) {
        this.logger.error(
          'Failed to parse JSON response from OpenAI:',
          parseError,
        );
        throw new Error('Invalid JSON response from OpenAI');
      }
    } catch (error) {
      this.logger.error(`Error parsing structured data: ${error.message}`);
      throw new Error(`Failed to parse structured data: ${error.message}`);
    }
  }

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
            const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getImageMimeType(buffer: Buffer): string {
    // Check magic bytes to determine image type
    if (buffer.length < 4) return 'image/jpeg'; // Default fallback

    const header = buffer.toString('hex', 0, 4);

    if (header.startsWith('ffd8')) return 'image/jpeg';
    if (header.startsWith('8950')) return 'image/png';
    if (header.startsWith('4749')) return 'image/gif';

    return 'image/jpeg'; // Default fallback
  }

  private validateAndCleanParsedData(data: any): ParsedResumeContent {
    return {
      personalInfo: {
        name: data.personalInfo?.name || null,
        email: data.personalInfo?.email || null,
        phone: data.personalInfo?.phone || null,
        location: data.personalInfo?.location || null,
        linkedinUrl: data.personalInfo?.linkedinUrl || null,
        portfolioUrl: data.personalInfo?.portfolioUrl || null,
      },
      summary: data.summary || null,
      skills: Array.isArray(data.skills) ? data.skills : [],
      experience: Array.isArray(data.experience)
        ? data.experience.map((exp) => ({
            company: exp.company || '',
            position: exp.position || '',
            startDate: exp.startDate || '',
            endDate: exp.endDate || null,
            description: exp.description || '',
            technologies: Array.isArray(exp.technologies)
              ? exp.technologies
              : [],
          }))
        : [],
      education: Array.isArray(data.education)
        ? data.education.map((edu) => ({
            institution: edu.institution || '',
            degree: edu.degree || '',
            field: edu.field || '',
            graduationYear: edu.graduationYear || null,
            gpa: edu.gpa || null,
          }))
        : [],
      certifications: Array.isArray(data.certifications)
        ? data.certifications
        : [],
      totalExperience:
        typeof data.totalExperience === 'number' ? data.totalExperience : 0,
    };
  }
}
