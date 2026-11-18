import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { DataBaseModule } from '../data-base/data-base.module';

@Module({
  // JwtModule is needed by AuthGuard; the cache manager is global.
  imports: [DataBaseModule, JwtModule.register({})],
  controllers: [AccountsController],
  providers: [AccountsService],
})
export class AccountsModule {}
