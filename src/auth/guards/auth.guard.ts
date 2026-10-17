import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { TokenPayload } from '../../common/utils/token-payload.interface.js';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const accessToken = extractTokenFromHeader(request);

    if (!accessToken) {
      throw new UnauthorizedException('No access token was provided');
    }
    try {
      const payload: TokenPayload = await this.jwtService.verifyAsync(
        accessToken,
        {
          secret: this.configService.getOrThrow<string>(
            'JWT_ACCESS_TOKEN_SECRET',
          ),
        },
      );

      const isBlacklisted = await this.cache.get(`blacklist:${payload.jti}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token revoked, please login again');
      }

      request['user'] = payload['user'];
      request['accessToken'] = accessToken;
    } catch (err) {
      console.error(`Error validating access token: ${err}`);
      throw new UnauthorizedException(
        'Invalid or expired access token, please login again!',
      );
    }

    return true;
  }
}

function extractTokenFromHeader(request: Request) {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  return type === 'Bearer' ? token : undefined;
}
