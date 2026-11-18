// Exact money handling: amounts live as bigint minor units (kobo/cents) and
// cross the API as major-unit decimal strings. Never route through Number.

// Mirrors the rows seeded by migration 20261027164401_seed_currencies.
export const CURRENCY_MINOR_UNITS: Readonly<Record<string, number>> = {
  NGN: 2,
  GBP: 2,
  USD: 2,
  EUR: 2,
};

export function getMinorUnits(currencyCode: string): number {
  const minor = CURRENCY_MINOR_UNITS[currencyCode];
  if (minor === undefined) {
    throw new Error(`unknown currency: ${currencyCode}`);
  }
  return minor;
}

export function moneyRegex(minor: number): RegExp {
  return minor === 0 ? /^-?\d+$/ : new RegExp(`^-?\\d+(\\.\\d{1,${minor}})?$`);
}

export function parseMoney(value: string, minor: number): bigint {
  if (!moneyRegex(minor).test(value)) {
    throw new Error(`invalid money string: ${value}`);
  }
  const negative = value.startsWith('-');
  const [int, frac = ''] = (negative ? value.slice(1) : value).split('.');
  const amount =
    BigInt(int) * 10n ** BigInt(minor) + BigInt(frac.padEnd(minor, '0') || '0');
  return negative ? -amount : amount;
}

export function formatMoney(amount: bigint, minor: number): string {
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const scale = 10n ** BigInt(minor);
  const int = (abs / scale).toString();
  const frac = (abs % scale).toString().padStart(minor, '0');
  const sign = negative ? '-' : '';
  return minor === 0 ? `${sign}${int}` : `${sign}${int}.${frac}`;
}

// n / d rounded half-to-even (banker's rounding).
export function divRoundHalfEven(n: bigint, d: bigint): bigint {
  if (d === 0n) throw new RangeError('division by zero');
  const q = n / d; // truncates toward zero
  const r = n % d;
  const twiceR = 2n * (r < 0n ? -r : r);
  const absD = d < 0n ? -d : d;
  // Direction away from zero for this quotient's sign.
  const step = n < 0n !== d < 0n ? -1n : 1n;
  if (twiceR > absD) return q + step;
  if (twiceR === absD && q % 2n !== 0n) return q + step;
  return q;
}
