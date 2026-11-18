import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { requestContext } from './request-context';

// Guards can't wrap the handler in run(), so open an empty store here and let
// AuthGuard populate it.
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction) {
    requestContext.run({}, () => next());
  }
}
