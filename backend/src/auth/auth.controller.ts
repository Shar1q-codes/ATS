import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, AuthResponse } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Request() req: any): Promise<{ user: any }> {
    const user = await this.authService.findById(req.user.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
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

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  getProfile(@Request() req: any) {
    return {
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        organizationId: req.user.organizationId,
        companyId: req.user.companyId,
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<{ message: string }> {
    // For now, we'll just return success since we're using stateless JWT tokens
    // In a production system, you might want to blacklist the tokens
    return { message: 'Logged out successfully' };
  }
}
