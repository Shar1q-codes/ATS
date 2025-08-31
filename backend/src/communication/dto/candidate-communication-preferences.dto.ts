import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommunicationFrequency } from '../../entities';

export class CreateCandidateCommunicationPreferencesDto {
  @IsUUID()
  candidateId: string;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  phoneEnabled?: boolean;

  @IsOptional()
  @IsEnum(CommunicationFrequency)
  applicationUpdatesFrequency?: CommunicationFrequency;

  @IsOptional()
  @IsEnum(CommunicationFrequency)
  marketingFrequency?: CommunicationFrequency;

  @IsOptional()
  @IsEnum(CommunicationFrequency)
  interviewRemindersFrequency?: CommunicationFrequency;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredTimes?: string[];

  @IsOptional()
  @IsString()
  timezone?: string;
}

export class UpdateCandidateCommunicationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  phoneEnabled?: boolean;

  @IsOptional()
  @IsEnum(CommunicationFrequency)
  applicationUpdatesFrequency?: CommunicationFrequency;

  @IsOptional()
  @IsEnum(CommunicationFrequency)
  marketingFrequency?: CommunicationFrequency;

  @IsOptional()
  @IsEnum(CommunicationFrequency)
  interviewRemindersFrequency?: CommunicationFrequency;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredTimes?: string[];

  @IsOptional()
  @IsString()
  timezone?: string;
}

export class OptOutDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CandidateCommunicationPreferencesResponseDto {
  id: string;
  candidateId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  phoneEnabled: boolean;
  applicationUpdatesFrequency: CommunicationFrequency;
  marketingFrequency: CommunicationFrequency;
  interviewRemindersFrequency: CommunicationFrequency;
  optedOut: boolean;
  optedOutAt?: Date;
  optOutReason?: string;
  preferredTimes?: string[];
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
}
