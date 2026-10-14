import {
  Controller,
  Get,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataBaseService } from './data-base/data-base.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly dataBaseService: DataBaseService) {}

  @Get()
  async checkHealth() {
    try {
      await this.dataBaseService.$queryRaw`SELECT 1`;

      return {
        message: 'Application is healthy',
        statusCode: HttpStatus.OK,
        data: { database: 'up' },
      };
    } catch (error) {
      throw new ServiceUnavailableException(
        'Application is unhealthy, database is down',
      );
    }
  }
}
