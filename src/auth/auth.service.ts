import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { TokenPayload } from '../common/utils/token-payload.interface.js';
import { SignUpDto } from './dto/sign-up.dto.js';
import { SignInDto } from './dto/sign-in.dto.js';
import { DataBaseService } from '../data-base/data-base.service.js';
import { MailService } from '../mail/mail.service.js';
import type { User } from '../generated/prisma/client.js';
import crypto from 'crypto';

export interface SignInMeta {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly dataBaseService: DataBaseService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const { email, name } = signUpDto;

    const existingUser = await this.dataBaseService.findUnique('user', {
      email,
    });
    if (existingUser) {
      throw new BadRequestException('Invalid credentials');
    }

    const user = await this.dataBaseService.create('user', { email, name });
    return {
      message: 'user created successfully',
      statusCode: 201,
      data: user,
    };
  }

  async signIn(signInDto: SignInDto, meta: SignInMeta = {}) {
    const { email } = signInDto;
    const response = {
      message: 'check your email for login link',
      statusCode: 200,
      data: {},
    };

    // Same response whether or not the account exists, so the endpoint
    // can't be used to discover registered emails.
    const user = (await this.dataBaseService.findUnique('user', {
      email,
    })) as User | null;
    if (!user) return response;

    const ttlMinutes = Number(
      this.configService.get<string>('MAGIC_LINK_TTL_MIN') ?? 15,
    );
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // A new link supersedes any older unused ones.
    await this.dataBaseService.updateMany(
      'magicLinkToken',
      { user_id: user.id, consumed_at: null },
      { consumed_at: new Date() },
    );
    await this.dataBaseService.create('magicLinkToken', {
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + ttlMinutes * 60_000),
      requested_ip: meta.ip,
      user_agent: meta.userAgent?.slice(0, 255),
    });

    const baseUrl = this.configService.getOrThrow<string>(
      'MAGIC_LINK_BASE_URL',
    );
    const magicLinkUrl = `${baseUrl}?token=${encodeURIComponent(token)}`;

    try {
      await this.mailService.sendTemplate(
        user.email,
        'Your sign-in link',
        'magic-link',
        {
          userName: user.name,
          magicLinkUrl,
          expiresInMinutes: ttlMinutes,
          requestedAt: `${new Intl.DateTimeFormat('en-GB', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'Africa/Lagos',
          }).format(new Date())} WAT`,
        },
      );
    } catch (err) {
      // Never log the token or URL; a failed send must not change the response.
      this.logger.error(
        `Magic link email failed for user ${user.id}: ${(err as Error).message}`,
      );
    }

    return response;
  }

  async verifyMagicLink(token: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = new Date();

    // The conditional update is the only consume path: if two requests race
    // with the same token, only one of them gets count === 1.
    const { count } = (await this.dataBaseService.updateMany(
      'magicLinkToken',
      { token_hash: tokenHash, consumed_at: null, expires_at: { gt: now } },
      { consumed_at: now },
    )) as { count: number };
    if (count !== 1) {
      throw new UnauthorizedException(
        'This sign-in link is invalid or has expired',
      );
    }

    const { user } = (await this.dataBaseService.findUnique(
      'magicLinkToken',
      { token_hash: tokenHash },
      { include: { user: true } },
    )) as { user: User };

    if (!user.email_verified_at) {
      await this.dataBaseService.update(
        'user',
        { id: user.id },
        { email_verified_at: now },
      );
    }

    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      type: 'access',
      user: { id: user.id, name: user.name, email: user.email },
      jti: crypto.randomUUID(),
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET'),
      expiresIn: '15m',
    });

    return {
      message: 'signed in successfully',
      statusCode: 200,
      data: {
        accessToken,
        user: { id: user.id, name: user.name, email: user.email },
      },
    };
  }

  async anonymize(id: string) {
    await this.dataBaseService.update(
      'user',
      { id },
      { email: `deleted-${id}@anonymized.invalid`, name: 'Deleted User' },
    );
    return {
      message: 'user account deleted successfully',
      statusCode: 200,
      data: {},
    };
  }
}
