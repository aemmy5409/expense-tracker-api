import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DataBaseModule } from './data-base/data-base.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DataBaseModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class AppModule {}
