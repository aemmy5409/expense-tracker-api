import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';

function run(exception: unknown) {
  const json = vi.fn((_body: Record<string, unknown>) => undefined);
  const status = vi.fn((_code: number) => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return { status: status.mock.calls[0]?.[0], body: json.mock.calls[0]?.[0] };
}

const prismaError = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError('db error', {
    code,
    clientVersion: 'test',
    meta,
  });

describe('AllExceptionsFilter', () => {
  it('wraps HttpExceptions in the envelope', () => {
    expect(run(new NotFoundException('account not found'))).toEqual({
      status: 404,
      body: {
        message: 'account not found',
        statusCode: 404,
        error: 'Not Found',
      },
    });
  });

  it('fills error for exceptions without one', () => {
    expect(run(new UnauthorizedException()).body).toEqual({
      message: 'Unauthorized',
      statusCode: 401,
      error: 'Unauthorized',
    });
  });

  it('flattens validation messages into message + errors', () => {
    const { body } = run(
      new BadRequestException(['name should not be empty', 'type is invalid']),
    );
    expect(body).toEqual({
      message: 'name should not be empty',
      statusCode: 400,
      error: 'Bad Request',
      errors: ['name should not be empty', 'type is invalid'],
    });
  });

  it('maps P2002 to 409 with the constraint fields', () => {
    expect(
      run(
        prismaError('P2002', {
          modelName: 'Account',
          target: ['user_id', 'name'],
        }),
      ),
    ).toEqual({
      status: 409,
      body: {
        message: 'an account with this user_id, name already exists',
        statusCode: 409,
        error: 'Conflict',
      },
    });
    expect(
      run(
        prismaError('P2002', {
          driverAdapterError: { cause: { constraint: { fields: ['email'] } } },
        }),
      ).body.message,
    ).toBe('a record with this email already exists');
    // Shape PrismaPg actually produces: index name only, plus modelName.
    expect(
      run(
        prismaError('P2002', {
          modelName: 'Currency',
          driverAdapterError: {
            cause: { constraint: { index: 'Currency_pkey' } },
          },
        }),
      ).body.message,
    ).toBe('a currency with this value already exists');
    expect(run(prismaError('P2002')).body.message).toBe(
      'a record with this value already exists',
    );
  });

  it('maps P2025 to 404', () => {
    expect(run(prismaError('P2025')).body).toEqual({
      message: 'record not found',
      statusCode: 404,
      error: 'Not Found',
    });
  });

  it('hides unknown errors behind a 500', () => {
    const { status, body } = run(new Error('boom: secret detail'));
    expect(status).toBe(500);
    expect(body).toEqual({
      message: 'Internal server error',
      statusCode: 500,
      error: 'Internal Server Error',
    });
  });
});
