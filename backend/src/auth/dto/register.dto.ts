import {
  IsEmail,
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  IsNotEmpty,
} from 'class-validator';
import { UserRole } from '../../entities/user.entity';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(['recruiter', 'hiring_manager'])
  role: 'recruiter' | 'hiring_manager';

  @IsString()
  @IsNotEmpty()
  companyName: string; // This will be used as organization name

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;
}
