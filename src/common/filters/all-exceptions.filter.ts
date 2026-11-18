import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { Prisma } from '../../generated/prisma/client';
import type { ErrorResponseDto } from '../dto/error-response.dto';

// Every error leaves the API as ErrorResponseDto. Services can still throw
// more specific HttpExceptions; Prisma errors that escape are mapped here.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toErrorResponse(exception);
    response.status(body.statusCode).json(body);
  }

  private toErrorResponse(exception: unknown): ErrorResponseDto {
    if (exception instanceof HttpException) {
      return fromHttpException(exception);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return envelope(HttpStatus.CONFLICT, duplicateMessage(exception));
      }
      if (exception.code === 'P2025') {
        return envelope(HttpStatus.NOT_FOUND, 'record not found');
      }
    }

    this.logger.error(
      exception instanceof Error ? exception.message : String(exception),
      exception instanceof Error ? exception.stack : undefined,
    );
    return envelope(HttpStatus.INTERNAL_SERVER_ERROR, 'Internal server error');
  }
}

function envelope(
  statusCode: number,
  message: string,
  error?: string,
  errors?: string[],
): ErrorResponseDto {
  return {
    message,
    statusCode,
    error: error ?? STATUS_CODES[statusCode] ?? 'Error',
    ...(errors && { errors }),
  };
}

function fromHttpException(exception: HttpException): ErrorResponseDto {
  const status = exception.getStatus();
  const res = exception.getResponse();
  if (typeof res === 'string') return envelope(status, res);

  const { message, error } = res as { message?: unknown; error?: unknown };
  const errorName = typeof error === 'string' ? error : undefined;

  // ValidationPipe reports every failed constraint as an array.
  if (Array.isArray(message)) {
    const errors = message.map(String);
    return envelope(status, errors[0] ?? exception.message, errorName, errors);
  }
  return envelope(
    status,
    typeof message === 'string' ? message : exception.message,
    errorName,
  );
}

// meta.target is set by the classic engine; driver adapters (PrismaPg) report
// the constraint under meta.driverAdapterError, often by index name only, so
// fall back to the model name.
function duplicateMessage(error: Prisma.PrismaClientKnownRequestError): string {
  const meta = error.meta as
    | {
        target?: unknown;
        modelName?: unknown;
        driverAdapterError?: { cause?: { constraint?: { fields?: unknown } } };
      }
    | undefined;
  const raw =
    meta?.target ?? meta?.driverAdapterError?.cause?.constraint?.fields;
  const fields = Array.isArray(raw)
    ? raw.map(String)
    : typeof raw === 'string'
      ? [raw]
      : [];
  const model =
    typeof meta?.modelName === 'string'
      ? meta.modelName.toLowerCase()
      : 'record';
  const what = fields.length ? fields.join(', ') : 'value';
  const article = /^[aeiou]/.test(model) ? 'an' : 'a';
  return `${article} ${model} with this ${what} already exists`;
}
