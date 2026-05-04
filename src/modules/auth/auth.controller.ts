import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpRequestDto } from './dto/sign-up.dto';
import { SignInRequestDto } from './dto/sign-in.dto';
import { type Request, type Response } from 'express';
import {
  ApiAuthController,
  ApiGetCurrentUser,
  ApiRefresh,
  ApiSignIn,
  ApiSignOut,
  ApiSignUp,
} from './docs/auth.swagger';
import { Authorization } from './decorators/authorization.decorator';
import { Authorized } from './decorators/authorized.decorator';
import type { User } from '@core/prisma/generated/prisma/client';

@ApiAuthController()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiSignUp()
  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  async signUp(
    @Res({ passthrough: true }) res: Response,
    @Body() dto: SignUpRequestDto,
  ) {
    return await this.authService.signUp(res, dto);
  }

  @ApiSignIn()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Res({ passthrough: true }) res: Response,
    @Body() dto: SignInRequestDto,
  ) {
    return await this.authService.signIn(res, dto);
  }

  @ApiRefresh()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return await this.authService.refresh(req, res);
  }

  @ApiSignOut()
  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }

  @ApiGetCurrentUser()
  @Authorization()
  @Get('me')
  @HttpCode(HttpStatus.OK)
  me(@Authorized() user: User) {
    return user;
  }
}
