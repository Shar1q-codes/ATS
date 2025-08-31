// Job Management Entities
export { JobFamily } from './job-family.entity';
export { JobTemplate, JobLevel } from './job-template.entity';
export {
  CompanyProfile,
  CompanySize,
  WorkArrangement,
  CompanyPreferences,
} from './company-profile.entity';
export { CompanyJobVariant } from './company-job-variant.entity';
export {
  RequirementItem,
  RequirementType,
  RequirementCategory,
} from './requirement-item.entity';
export { JdVersion, ResolvedJobSpec } from './jd-version.entity';

// User Management Entities
export { User, UserRole } from './user.entity';
export {
  Organization,
  OrganizationType,
  SubscriptionPlan,
} from './organization.entity';

// Candidate Management Entities
export { Candidate } from './candidate.entity';
export {
  ParsedResumeData,
  Skill,
  WorkExperience,
  Education,
  Certification,
} from './parsed-resume-data.entity';

// Application Management Entities
export { Application, PipelineStage } from './application.entity';
export { MatchExplanation, RequirementMatch } from './match-explanation.entity';
export { ApplicationNote } from './application-note.entity';
export { StageHistoryEntry } from './stage-history-entry.entity';

// Communication Entities
export {
  EmailTemplate,
  EmailTemplateType,
  EmailTemplateStatus,
} from './email-template.entity';
export { EmailLog, EmailStatus } from './email-log.entity';
export {
  CommunicationHistory,
  CommunicationType,
  CommunicationDirection,
} from './communication-history.entity';
export {
  CandidateCommunicationPreferences,
  CommunicationChannel,
  CommunicationFrequency,
} from './candidate-communication-preferences.entity';
