export interface TokenPayload {
  type: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  jti: string;
  iat: number;
  exp: number;
}
