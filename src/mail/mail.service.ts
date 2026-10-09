import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import ejs from 'ejs';
import type { MailTemplateName, MailTemplates } from './mail-templates.js';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const TEMPLATES_DIR = join(import.meta.dirname, 'templates');

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  async render<T extends MailTemplateName>(
    name: T,
    data: MailTemplates[T],
  ): Promise<{ html: string; text?: string }> {
    const opts: ejs.Options = {
      cache: this.configService.get<string>('NODE_ENV') === 'production',
    };
    const locals = {
      appName: this.configService.get<string>('APP_NAME') ?? 'Expense Tracker',
      year: new Date().getFullYear(),
      ...data,
    };

    const html = await ejs.renderFile(
      join(TEMPLATES_DIR, `${name}.ejs`),
      locals,
      opts,
    );

    const textPath = join(TEMPLATES_DIR, `${name}.txt.ejs`);
    const text = existsSync(textPath)
      ? await ejs.renderFile(textPath, locals, opts)
      : undefined;

    return { html, text };
  }

  async sendTemplate<T extends MailTemplateName>(
    to: string,
    subject: string,
    name: T,
    data: MailTemplates[T],
  ): Promise<void> {
    const { html, text } = await this.render(name, data);
    await this.send({ to, subject, html, text });
  }

  async send(data: SendMailOptions): Promise<void> {
    const { to, subject, html, text } = data;
    const res = await fetch(
      `${this.configService.getOrThrow<string>('BREVO_API_URL')}`,
      {
        method: 'POST',
        headers: {
          'api-key': this.configService.getOrThrow<string>('BREVO_API_KEY'),
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: this.configService.getOrThrow<string>('BREVO_SENDER_NAME'),
            email: this.configService.getOrThrow<string>('BREVO_SENDER_EMAIL'),
          },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      },
    );
    if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
  }
}
