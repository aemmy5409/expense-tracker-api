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
import { CURRENCY_MINOR_UNITS, formatMoney } from '../money/index';

interface SuccessResponse<T = unknown> {
  message?: string;
  data?: T;
}

const MINOR_SUFFIX = '_minor';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
};

// JSON.stringify throws on bigint, so every bigint is converted here once:
// `*_minor` fields beside a known currency_code become major-unit strings under
// the unsuffixed key (opening_balance_minor: 150000n -> opening_balance: "1500.00");
// any other bigint becomes its plain string.
export function serializeMoney(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(serializeMoney);
  if (!isPlainObject(value)) return value;

  const code = value.currency_code;
  const minor =
    typeof code === 'string' ? CURRENCY_MINOR_UNITS[code] : undefined;

  const result: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(value)) {
    if (
      typeof field === 'bigint' &&
      key.endsWith(MINOR_SUFFIX) &&
      minor !== undefined
    ) {
      result[key.slice(0, -MINOR_SUFFIX.length)] = formatMoney(field, minor);
    } else {
      result[key] = serializeMoney(field);
    }
  }
  return result;
}

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data: SuccessResponse) => ({
        message: data?.message ?? 'Success',
        statusCode: response.statusCode ?? HttpStatus.OK,
        data: serializeMoney(data?.data ?? data),
      })),
    );
  }
}
