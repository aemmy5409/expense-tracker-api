import { JwtService } from '@nestjs/jwt';
import { Injectable, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID, randomBytes } from 'crypto';
import { Request } from 'express';

import { UserPayload } from './user-payload.interface.js';
import { DataBaseService } from '../../data-base/data-base.service.js';
import { TokenPayload } from './token-payload.interface.js';

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class TokenUtils {
  private readonly refresh_ttl_ms;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataBaseService: DataBaseService,
  ) {
    const configTTl = this.configService.get<number>('REFRESH_TOKEN_TTL');
    this.refresh_ttl_ms = configTTl ? Number(configTTl) : REFRESH_TOKEN_TTL;
  }

  private generateRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }

  async generateAuthTokens(user: UserPayload) {
    const jti = randomUUID();
    const payload = { user, jti };

    const accessTokenExpirationTime =
      parseInt(
        this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_EXPIRATION_MS'),
      ) / 1000;

    const accessToken = this.jwtService.sign(
      { type: 'access', ...payload },
      {
        secret: this.configService.getOrThrow<string>(
          'JWT_ACCESS_TOKEN_SECRET',
        ),
        expiresIn: accessTokenExpirationTime,
      },
    );

    const refreshToken = this.generateRefreshToken();

    await this.dataBaseService.create('session', {
      user_id: user.id,
      refresh_token_hash: hashToken(refreshToken),
      expires_at: new Date(Date.now() + this.refresh_ttl_ms),
    });

    const accessTokenExpiresAt =
      Date.now() +
      Number(
        this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_EXPIRATION_MS'),
      );

    return { accessToken, refreshToken, accessTokenExpiresAt };
  }

  async getAccessTokenAndJTI(req: Request) {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) return;

    const payload: TokenPayload = await this.jwtService.verifyAsync(
      token as string,
      {
        secret: this.configService.getOrThrow<string>(
          'JWT_ACCESS_TOKEN_SECRET',
        ),
      },
    );

    return { token, jti: payload['jti'], exp: payload.exp };
  }
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
