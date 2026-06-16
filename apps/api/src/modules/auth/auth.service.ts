import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './types/authenticated-user';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      phone: dto.phone,
      role: dto.role,
    });

    return this.issueTokens(user.id, user.email, user.role, user.name);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordMatches = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.issueTokens(user.id, user.email, user.role, user.name);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    let payload: JwtPayload & { jti: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (stored.revoked || stored.expiresAt < new Date()) {
      // Possível reuso de um token já rotacionado: revoga toda a sessão do usuário.
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revoked: false },
        data: { revoked: true },
      });
      throw new UnauthorizedException('Sessão inválida, faça login novamente');
    }

    const user = await this.usersService.findById(stored.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário inválido');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    return this.issueTokens(user.id, user.email, user.role, user.name);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const currentPasswordMatches = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!currentPasswordMatches) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.usersService.update(userId, { passwordHash });
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: AuthResponseDto['user']['role'],
    name: string,
  ): Promise<AuthResponseDto> {
    const payload: JwtPayload = { sub: userId, email, role };

    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiresIn as unknown as number,
    });

    const jti = randomUUID();
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');
    const refreshToken = await this.jwtService.signAsync(
      { ...payload, jti },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn as unknown as number,
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: this.addDuration(new Date(), refreshExpiresIn),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email, name, role },
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private addDuration(date: Date, duration: string): Date {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Formato de duração inválido: ${duration}`);
    }
    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return new Date(date.getTime() + value * multipliers[unit]);
  }
}
