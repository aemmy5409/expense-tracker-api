import { Module } from '@nestjs/common';
import { DataBaseService } from './data-base.service';

@Module({
  providers: [DataBaseService],
  exports: [DataBaseService],
})
export class DataBaseModule {}
