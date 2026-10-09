import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

interface SuccessResponse<T = unknown> {
  message?: string;
  data?: T;
}

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data: SuccessResponse) => ({
        message: data?.message ?? 'Success',
        statusCode: response.statusCode ?? HttpStatus.OK,
        // Prisma Decimals would otherwise serialize as strings.
        data: data?.data ?? data,
      })),
    );
  }
}
