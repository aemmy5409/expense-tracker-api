export interface MailTemplates {
  'magic-link': {
    userName: string;
    magicLinkUrl: string;
    expiresInMinutes: number;
    requestedAt: string; // pre-formatted, e.g. "9 Oct 2026, 09:41"
    device?: string; // e.g. "Chrome on macOS"
    location?: string; // e.g. "Lagos, NG"
    supportEmail?: string;
  };
}

export type MailTemplateName = keyof MailTemplates;
