import { ParsedResumeData } from '../../entities/parsed-resume-data.entity';
import { Application } from '../../entities/application.entity';

export class CandidateResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  skillEmbeddings?: number[];
  totalExperience: number;
  consentGiven: boolean;
  consentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  parsedData?: ParsedResumeData;
  applications?: Application[];
}
