import { IsString, IsOptional, IsEnum, IsUrl } from 'class-validator';
import {
  OrganizationType,
  SubscriptionPlan,
} from '../../entities/organization.entity';

export class CreateOrganizationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsEnum(OrganizationType)
  type?: OrganizationType;

  @IsOptional()
  @IsEnum(SubscriptionPlan)
  subscriptionPlan?: SubscriptionPlan;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  settings?: Record<string, any>;
}
