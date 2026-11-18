import type { User } from '../../generated/prisma/client';
export interface UserPayload extends Pick<User, 'id' | 'name' | 'email'> {}
