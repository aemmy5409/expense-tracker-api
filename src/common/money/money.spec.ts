import {
  divRoundHalfEven,
  formatMoney,
  getMinorUnits,
  parseMoney,
} from './money';

describe('parseMoney / formatMoney', () => {
  it.each([
    ['0', 2, 0n, '0.00'],
    ['1500', 2, 150000n, '1500.00'],
    ['1500.5', 2, 150050n, '1500.50'],
    ['1500.05', 2, 150005n, '1500.05'],
    ['-0.01', 2, -1n, '-0.01'],
    ['-12.3', 2, -1230n, '-12.30'],
    ['42', 0, 42n, '42'],
    ['9007199254740993.99', 2, 900719925474099399n, '9007199254740993.99'],
  ])('%s (minor %i)', (input, minor, expected, formatted) => {
    expect(parseMoney(input, minor)).toBe(expected);
    expect(formatMoney(expected, minor)).toBe(formatted);
  });

  it.each(['1.', '.5', '1.234', '1e3', ' 1', '', '--1', '1,000'])(
    'rejects %j',
    (input) => {
      expect(() => parseMoney(input, 2)).toThrow();
    },
  );

  it('rejects decimals when minor is 0', () => {
    expect(() => parseMoney('1.5', 0)).toThrow();
  });
});

describe('divRoundHalfEven', () => {
  it.each([
    [25n, 10n, 2n],
    [35n, 10n, 4n],
    [26n, 10n, 3n],
    [24n, 10n, 2n],
    [-25n, 10n, -2n],
    [-35n, 10n, -4n],
    [-26n, 10n, -3n],
    [25n, -10n, -2n],
    [20n, 10n, 2n],
  ])('%i / %i = %i', (n, d, expected) => {
    expect(divRoundHalfEven(n, d)).toBe(expected);
  });

  it('throws on division by zero', () => {
    expect(() => divRoundHalfEven(1n, 0n)).toThrow(RangeError);
  });
});

describe('getMinorUnits', () => {
  it('returns seeded currencies and throws on unknown', () => {
    expect(getMinorUnits('NGN')).toBe(2);
    expect(() => getMinorUnits('XYZ')).toThrow();
  });
});
