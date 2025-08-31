import {
  IsEnum,
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommunicationType, CommunicationDirection } from '../../entities';

export class CreateCommunicationHistoryDto {
  @IsEnum(CommunicationType)
  type: CommunicationType;

  @IsEnum(CommunicationDirection)
  direction: CommunicationDirection;

  @IsString()
  subject: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  fromAddress?: string;

  @IsOptional()
  @IsString()
  toAddress?: string;

  @IsUUID()
  candidateId: string;

  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @IsOptional()
  @IsUUID()
  initiatedBy?: string;

  @IsOptional()
  @IsUUID()
  emailLogId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateCommunicationHistoryDto {
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @Type(() => Date)
  readAt?: Date;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CommunicationHistoryResponseDto {
  id: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  subject: string;
  content: string;
  fromAddress?: string;
  toAddress?: string;
  isRead: boolean;
  readAt?: Date;
  candidateId: string;
  applicationId?: string;
  initiatedBy?: string;
  emailLogId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class CommunicationHistoryQueryDto {
  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @IsOptional()
  @IsEnum(CommunicationType)
  type?: CommunicationType;

  @IsOptional()
  @IsEnum(CommunicationDirection)
  direction?: CommunicationDirection;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
