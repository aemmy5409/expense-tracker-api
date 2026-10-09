import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service.js';

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('render magic-link', () => {
    const data = {
      userName: '<b>Ada</b>',
      magicLinkUrl: 'https://app.test/auth/magic?token=abc',
      expiresInMinutes: 15,
      requestedAt: '9 Oct 2026, 09:41',
    };

    it('renders html with escaped user input', async () => {
      const { html } = await service.render('magic-link', data);

      expect(html).toContain('&lt;b&gt;Ada&lt;/b&gt;');
      expect(html).toContain('https://app.test/auth/magic?token=abc');
      expect(html).toContain('Expense Tracker');
    });

    it('omits optional rows when not provided', async () => {
      const { html } = await service.render('magic-link', data);

      expect(html).not.toContain('>Device<');
      expect(html).not.toContain('mailto:');
    });

    it('includes optional rows when provided', async () => {
      const { html } = await service.render('magic-link', {
        ...data,
        device: 'Chrome on macOS',
        supportEmail: 'help@app.test',
      });

      expect(html).toContain('Chrome on macOS');
      expect(html).toContain('mailto:help@app.test');
    });

    it('renders a plain-text version', async () => {
      const { text } = await service.render('magic-link', data);

      expect(text).toContain('Hi <b>Ada</b>,');
      expect(text).toContain('https://app.test/auth/magic?token=abc');
    });
  });
});
