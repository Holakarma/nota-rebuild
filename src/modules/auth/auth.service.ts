import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { SignUpRequestDto } from './dto/sign-up.dto';
import { ConfigService } from '@nestjs/config';
import { hash, verify } from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { SignInRequestDto } from './dto/sign-in.dto';
import { type Request, type Response } from 'express';
import { isDev } from '@shared/utils/is-dev.util';
import type { JwtPayload } from './interfaces/jwt.interface';
import type { StringValue } from 'ms';

@Injectable()
export class AuthService {
  private readonly JWT_ACCESS_TTL: StringValue;
  private readonly JWT_REFRESH_TTL: StringValue;
  private readonly COOKIE_DOMAIN: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.JWT_ACCESS_TTL = this.config.getOrThrow('JWT_ACCESS_TTL');
    this.JWT_REFRESH_TTL = this.config.getOrThrow('JWT_REFRESH_TTL');
    this.COOKIE_DOMAIN = this.config.getOrThrow('COOKIE_DOMAIN');
  }

  async signUp(res: Response, dto: SignUpRequestDto) {
    const { login, password } = dto;

    const existUser = await this.prisma.user.findUnique({ where: { login } });

    if (existUser) {
      throw new ConflictException('User with this login is already esists');
    }

    const user = await this.prisma.user.create({
      data: {
        login,
        passwordHash: await hash(password),
      },
      select: {
        id: true,
      },
    });

    return this.auth(res, user.id);
  }

  async signIn(res: Response, dto: SignInRequestDto) {
    const { login, password } = dto;

    const user = await this.prisma.user.findUnique({
      where: { login },
      select: { id: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      throw new NotFoundException('User was not found');
    }

    const isValidPassword = await verify(user.passwordHash, password);

    if (!isValidPassword) {
      throw new NotFoundException('User was not found');
    }

    return this.auth(res, user.id);
  }

  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies['refreshToken'] as string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('invalid refresh token');
    }

    const payload: JwtPayload = await this.jwtService.verifyAsync(refreshToken);
    if (payload) {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundException('User was not found');
      }

      return this.auth(res, user.id);
    }
  }

  logout(res: Response) {
    this.setCookie(res, 'refreshToken', new Date(0)); // delete cookie
    return true;
  }

  async validate(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private auth(res: Response, id: string) {
    const { accessToken, refreshToken } = this.generateTokens(id);
    this.setCookie(res, refreshToken, new Date(Date.now() + 60 * 60 * 24 * 7)); // Грамотно перенести в .env
    return { accessToken };
  }

  private generateTokens(id: string) {
    const payload: JwtPayload = { id };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.JWT_ACCESS_TTL,
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.JWT_REFRESH_TTL,
    });

    return { accessToken, refreshToken };
  }

  private setCookie(res: Response, value: string, expires: Date) {
    res.cookie('refreshToken', value, {
      httpOnly: true,
      domain: this.COOKIE_DOMAIN,
      expires,
      secure: !isDev(this.config),
      sameSite: 'lax',
    });
  }
}
