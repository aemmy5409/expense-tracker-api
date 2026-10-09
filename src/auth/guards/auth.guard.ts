import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { TokenPayload } from '../../common/utils/token-payload.interface.js';
// import { RedisService } from 'src/redis/redis.service';

// lastUsedAt is for auditing, not billing — minute-level accuracy is plenty
// and saves a write on every request.
const LAST_USED_WRITE_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    // private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const accessToken = this.extractTokenFromHeader(request);

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

      //   const isBlacklisted = await this.redisService.get(
      //     `blacklist:${payload.jti}`,
      //   );
      //   if (isBlacklisted) {
      //     throw new UnauthorizedException('Token revoked, please login again');
      //   }

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

  private extractTokenFromHeader(request: Request) {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
