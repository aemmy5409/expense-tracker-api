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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { AuthGuard } from './guards/auth.guard';
import type { TokenPayload } from '../common/utils/token-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { Request } from 'express';
import { ApiBearerAuth } from '@nestjs/swagger';
import { SignOutGuard } from './guards/sign-out.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: TokenPayload['user']) {
    return this.authService.me(user.id);
  }

  @Post('refresh')
  @HttpCode(200)
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
