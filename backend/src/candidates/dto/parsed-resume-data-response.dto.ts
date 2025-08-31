import {
  Skill,
  WorkExperience,
  Education,
  Certification,
} from '../../entities/parsed-resume-data.entity';
import { Candidate } from '../../entities/candidate.entity';

export class ParsedResumeDataResponseDto {
  id: string;
  candidateId: string;
  skills?: Skill[];
  experience?: WorkExperience[];
  education?: Education[];
  certifications?: Certification[];
  summary?: string;
  rawText?: string;
  parsingConfidence?: number;
  createdAt: Date;
  candidate?: Candidate;
}
