import { Module } from '@nestjs/common';
import { DataBaseService } from './data-base.service.js';

@Module({
  providers: [DataBaseService],
  exports: [DataBaseService],
})
export class DataBaseModule {}
