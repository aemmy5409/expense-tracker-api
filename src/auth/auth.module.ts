import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { DataBaseModule } from '../data-base/data-base.module.js';
import { MailModule } from '../mail/mail.module.js';
import { CacheModule } from '../cache/cache.module.js';
import { TokenUtils } from '../common/utils/auth-token-generator.js';

@Module({
  imports: [DataBaseModule, MailModule, JwtModule.register({}), CacheModule],
  controllers: [AuthController],
  providers: [AuthService, TokenUtils],
})
export class AuthModule {}
