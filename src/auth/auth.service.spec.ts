import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { DataBaseService } from '../data-base/data-base.service.js';
import { MailService } from '../mail/mail.service.js';

describe('AuthService', () => {
  let service: AuthService;
  const db = {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const mail = { sendTemplate: vi.fn() };
  const env: Record<string, string> = {
    MAGIC_LINK_BASE_URL: 'https://app.test/auth/magic',
    JWT_ACCESS_TOKEN_SECRET: 'test-secret',
  };
  const jwt = new JwtService();
  const config = {
    get: (key: string) => env[key],
    getOrThrow: (key: string) => env[key],
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DataBaseService, useValue: db },
        { provide: MailService, useValue: mail },
        { provide: ConfigService, useValue: config },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signIn', () => {
    const user = { id: 'u1', email: 'ada@example.com', name: 'Ada' };

    it('returns the same response and sends nothing for an unknown email', async () => {
      db.findUnique.mockResolvedValue(null);

      const res = await service.signIn({ email: 'nobody@example.com' });

      expect(res.message).toBe('check your email for login link');
      expect(db.create).not.toHaveBeenCalled();
      expect(mail.sendTemplate).not.toHaveBeenCalled();
    });

    it('stores only the hash of the token and emails the raw token', async () => {
      db.findUnique.mockResolvedValue(user);

      await service.signIn(
        { email: user.email },
        { ip: '127.0.0.1', userAgent: 'vitest' },
      );

      const stored = db.create.mock.calls[0][1];
      const [to, , template, data] = mail.sendTemplate.mock.calls[0];
      const rawToken = new URL(data.magicLinkUrl).searchParams.get('token')!;

      expect(to).toBe(user.email);
      expect(template).toBe('magic-link');
      expect(data.userName).toBe('Ada');
      expect(data.magicLinkUrl).toMatch(
        /^https:\/\/app\.test\/auth\/magic\?token=/,
      );
      expect(stored.token_hash).toBe(
        crypto.createHash('sha256').update(rawToken).digest('hex'),
      );
      expect(stored.token_hash).not.toBe(rawToken);
      expect(stored).toMatchObject({
        user_id: 'u1',
        requested_ip: '127.0.0.1',
        user_agent: 'vitest',
      });
    });

    it('expires the link after the default 15 minutes', async () => {
      db.findUnique.mockResolvedValue(user);
      const before = Date.now();

      await service.signIn({ email: user.email });

      const expiresAt: Date = db.create.mock.calls[0][1].expires_at;
      expect(expiresAt.getTime() - before).toBeGreaterThanOrEqual(15 * 60_000);
      expect(expiresAt.getTime() - before).toBeLessThan(15 * 60_000 + 5_000);
      expect(mail.sendTemplate.mock.calls[0][3].expiresInMinutes).toBe(15);
    });

    it('supersedes older unused links', async () => {
      db.findUnique.mockResolvedValue(user);

      await service.signIn({ email: user.email });

      expect(db.updateMany).toHaveBeenCalledWith(
        'magicLinkToken',
        { user_id: 'u1', consumed_at: null },
        { consumed_at: expect.any(Date) },
      );
    });

    it('still returns the normal response when the email fails to send', async () => {
      db.findUnique.mockResolvedValue(user);
      mail.sendTemplate.mockRejectedValue(new Error('Brevo 500'));

      const res = await service.signIn({ email: user.email });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('validateLink', () => {
    const rawToken = 'raw-token-from-email';
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const user = {
      id: 'u1',
      email: 'ada@example.com',
      name: 'Ada',
      email_verified_at: null as Date | null,
    };

    it('consumes only an unused, unexpired token matching the hash', async () => {
      db.updateMany.mockResolvedValue({ count: 1 });
      db.findUnique.mockResolvedValue({ user });

      await service.validateLink(rawToken);

      expect(db.updateMany).toHaveBeenCalledWith(
        'magicLinkToken',
        {
          token_hash: hash,
          consumed_at: null,
          expires_at: { gt: expect.any(Date) },
        },
        { consumed_at: expect.any(Date) },
      );
    });

    it('returns an access token the AuthGuard can verify', async () => {
      db.updateMany.mockResolvedValue({ count: 1 });
      db.findUnique.mockResolvedValue({ user });

      const res = await service.validateLink(rawToken);
      const payload = await jwt.verifyAsync(res.data.accessToken, {
        secret: 'test-secret',
      });

      expect(payload.type).toBe('access');
      expect(payload.user).toEqual({
        id: 'u1',
        name: 'Ada',
        email: 'ada@example.com',
      });
      expect(payload.jti).toEqual(expect.any(String));
      expect(payload.exp - payload.iat).toBe(15 * 60);
    });

    it('sets email_verified_at on first use only', async () => {
      db.updateMany.mockResolvedValue({ count: 1 });
      db.findUnique.mockResolvedValue({ user });
      await service.validateLink(rawToken);
      expect(db.update).toHaveBeenCalledWith(
        'user',
        { id: 'u1' },
        { email_verified_at: expect.any(Date) },
      );

      db.update.mockClear();
      db.findUnique.mockResolvedValue({
        user: { ...user, email_verified_at: new Date() },
      });
      await service.validateLink(rawToken);
      expect(db.update).not.toHaveBeenCalled();
    });

    it('rejects an invalid, expired, used or superseded token', async () => {
      db.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.validateLink(rawToken)).rejects.toThrow(
        'This sign-in link is invalid or has expired',
      );
      expect(db.findUnique).not.toHaveBeenCalled();
    });
  });
});
