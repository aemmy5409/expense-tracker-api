import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DataBaseModule } from './data-base/data-base.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { DataBaseService } from './data-base/data-base.service';
import { HealthController } from './health.controller';
import { AccountsModule } from './accounts/accounts.module';
import { RequestContextMiddleware } from './common/context/request-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DataBaseModule,
    AuthModule,
    MailModule,
    AccountsModule,
  ],
  controllers: [HealthController],
  providers: [DataBaseService],
  exports: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
