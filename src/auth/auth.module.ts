import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { DataBaseModule } from '../data-base/data-base.module.js';
import { MailModule } from '../mail/mail.module.js';

@Module({
  imports: [DataBaseModule, MailModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
