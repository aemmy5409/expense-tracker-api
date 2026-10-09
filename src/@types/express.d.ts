declare namespace Express {
  export interface Request {
    user?: {
      [key: string]: any;
    };
    accessToken?: string;
    refreshToken?: string;
  }
}
