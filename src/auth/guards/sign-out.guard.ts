import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';

@Injectable()
export class SignOutGuard extends AuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Execute the original strict guard logic
      return await super.canActivate(context);
    } catch (err) {
      // If any error is thrown (missing token, invalid token, blacklisted, etc.)
      // Catch it and let the request pass through safely without a user payload.
      return true;
    }
  }
}
