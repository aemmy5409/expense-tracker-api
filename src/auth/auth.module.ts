import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DataBaseModule } from '../data-base/data-base.module';
import { MailModule } from '../mail/mail.module';
import { CacheModule } from '../cache/cache.module';
import { TokenUtils } from '../common/utils/auth-token-generator';

@Module({
  imports: [DataBaseModule, MailModule, JwtModule.register({}), CacheModule],
  controllers: [AuthController],
  providers: [AuthService, TokenUtils],
})
export class AuthModule {}
