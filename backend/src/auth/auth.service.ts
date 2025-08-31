import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import {
  Organization,
  OrganizationType,
  SubscriptionPlan,
} from '../entities/organization.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  organizationId: string;
  companyId?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    organizationId: string;
    companyId?: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    password: string,
    organizationId?: string,
  ): Promise<User | null> {
    const whereCondition: any = { email, isActive: true };
    if (organizationId) {
      whereCondition.organizationId = organizationId;
    }

    const user = await this.userRepository.findOne({
      where: whereCondition,
      relations: ['company', 'organization'],
    });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      return user;
    }

    return null;
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    // For login, we need to find the user across all organizations
    // In a real multi-tenant system, you might want to require organization context
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email, isActive: true },
      relations: ['company', 'organization'],
    });

    if (
      !user ||
      !(await bcrypt.compare(loginDto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      companyId: user.companyId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        companyId: user.companyId,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      // Create organization first if this is a new signup
      let organizationId = registerDto.organizationId;

      if (!organizationId) {
        // Create a new organization for the user using companyName from frontend
        const organization = this.organizationRepository.create({
          name: registerDto.companyName,
          type: OrganizationType.SMB,
          subscriptionPlan: SubscriptionPlan.FREE,
        });

        const savedOrganization =
          await this.organizationRepository.save(organization);
        organizationId = savedOrganization.id;
      }

      // Check if user already exists in this organization
      const existingUser = await this.userRepository.findOne({
        where: { email: registerDto.email, organizationId },
      });

      if (existingUser) {
        throw new ConflictException(
          'An account with this email already exists in this organization',
        );
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

      // Map frontend role to backend enum
      const userRole =
        registerDto.role === 'recruiter'
          ? UserRole.RECRUITER
          : UserRole.HIRING_MANAGER;

      // Create user
      const user = this.userRepository.create({
        email: registerDto.email,
        passwordHash,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: userRole,
        organizationId,
        companyId: registerDto.companyId,
        isActive: true,
      });

      const savedUser = await this.userRepository.save(user);

      const payload: JwtPayload = {
        sub: savedUser.id,
        email: savedUser.email,
        role: savedUser.role,
        organizationId: savedUser.organizationId,
        companyId: savedUser.companyId,
      };

      const accessToken = this.jwtService.sign(payload);
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      return {
        accessToken,
        refreshToken,
        expiresIn: 3600, // 1 hour in seconds
        user: {
          id: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          role: savedUser.role,
          organizationId: savedUser.organizationId,
          companyId: savedUser.companyId,
        },
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      // Handle database constraint violations
      if (error.code === '23505') {
        // PostgreSQL unique violation
        throw new ConflictException(
          'An account with this email already exists',
        );
      }

      throw new InternalServerErrorException(
        'Registration failed. Please try again.',
      );
    }
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub, isActive: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        companyId: user.companyId,
      };

      const newAccessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: '7d',
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600, // 1 hour in seconds
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id, isActive: true },
      relations: ['company', 'organization'],
    });
  }
}
