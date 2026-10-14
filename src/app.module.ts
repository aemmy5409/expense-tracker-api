import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DataBaseModule } from './data-base/data-base.module.js';
import { AuthModule } from './auth/auth.module.js';
import { MailModule } from './mail/mail.module.js';
import { DataBaseService } from './data-base/data-base.service.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DataBaseModule,
    AuthModule,
    MailModule,
  ],
  controllers: [HealthController],
  providers: [DataBaseService],
  exports: [],
})
export class AppModule {}
