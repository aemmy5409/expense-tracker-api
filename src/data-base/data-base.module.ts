import { Module } from '@nestjs/common';
import { DataBaseService } from './data-base.service.js';

@Module({
  providers: [DataBaseService]
})
export class DataBaseModule {}
