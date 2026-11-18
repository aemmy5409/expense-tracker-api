import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestStore {
  userId?: string;
}

// Opened per request by RequestContextMiddleware; AuthGuard fills in userId.
export const requestContext = new AsyncLocalStorage<RequestStore>();

export const currentUserId = () => requestContext.getStore()?.userId;
