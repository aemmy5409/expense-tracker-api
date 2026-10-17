import type { User } from '../../generated/prisma/client.js';
export interface UserPayload extends Pick<User, 'id' | 'name' | 'email'> {}
