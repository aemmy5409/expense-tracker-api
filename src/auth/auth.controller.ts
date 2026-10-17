import {
  Controller,
  Post,
  Body,
  Delete,
  Headers,
  HttpCode,
  Ip,
  UseGuards,
  Param,
  Get,
  Req,
  Cookies,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { SignUpDto } from './dto/sign-up.dto.js';
import { SignInDto } from './dto/sign-in.dto.js';
import { AuthGuard } from './guards/auth.guard.js';
import type { TokenPayload } from '../common/utils/token-payload.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { Request } from 'express';
import { ApiBearerAuth } from '@nestjs/swagger';
import { SignOutGuard } from './guards/sign-out.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: TokenPayload['user']) {
    return this.authService.me(user.id);
  }

  @Get('refresh')
  @ApiBearerAuth('x-auth-refresh-token')
  refresh(@Headers('x-auth-refresh-token') token: string) {
    return this.authService.refreshToken(token);
  }

  @Post('sign-up')
  create(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('sign-in')
  findAll(
    @Body() signInDto: SignInDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.signIn(signInDto, { ip, userAgent });
  }

  @Post('magic-link/verify/:token')
  @HttpCode(200)
  verifyMagicLink(@Param('token') token: string) {
    return this.authService.verifyMagicLink(token);
  }

  @Post('sign-out')
  @UseGuards(SignOutGuard)
  signOut(@Req() req: Request, @CurrentUser() user?: TokenPayload['user']) {
    return this.authService.signOut(req, user?.id);
  }

  @Delete('anonymize')
  @UseGuards(AuthGuard)
  remove(@CurrentUser() user: TokenPayload['user']) {
    return this.authService.anonymize(user.id);
  }
}
