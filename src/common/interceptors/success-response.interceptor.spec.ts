import { serializeMoney } from './success-response.interceptor';

describe('serializeMoney', () => {
  it('converts *_minor bigints to major-unit strings under the unsuffixed key', () => {
    const date = new Date('2026-10-01');
    const out = serializeMoney([
      {
        id: 'a',
        currency_code: 'NGN',
        opening_balance_minor: 150000n,
        opening_balance_date: date,
      },
    ]);

    expect(out).toEqual([
      {
        id: 'a',
        currency_code: 'NGN',
        opening_balance: '1500.00',
        opening_balance_date: date,
      },
    ]);
    expect(() => JSON.stringify(out)).not.toThrow();
  });

  it('recurses into nested objects', () => {
    expect(
      serializeMoney({ account: { currency_code: 'USD', balance_minor: -5n } }),
    ).toEqual({ account: { currency_code: 'USD', balance: '-0.05' } });
  });

  it('stringifies bigints that have no known currency', () => {
    const out = serializeMoney({ count: 3n, amount_minor: 10n });
    expect(out).toEqual({ count: '3', amount_minor: '10' });
    expect(() => JSON.stringify(out)).not.toThrow();
  });

  it('passes primitives and null through', () => {
    expect(serializeMoney(null)).toBeNull();
    expect(serializeMoney('x')).toBe('x');
  });
});
