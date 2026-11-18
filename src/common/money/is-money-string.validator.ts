import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';
import { CURRENCY_MINOR_UNITS, moneyRegex } from './money';

// DB check constraint caps Currency.minor_units at 4.
const MAX_MINOR_UNITS = 4;

const minorUnitsFor = (args: ValidationArguments): number => {
  const [currencyProperty] = args.constraints as [string];
  const code = (args.object as Record<string, unknown>)[currencyProperty];
  // Unknown codes fall through so the service can report "unsupported currency".
  const minor =
    typeof code === 'string' ? CURRENCY_MINOR_UNITS[code] : undefined;
  return minor ?? MAX_MINOR_UNITS;
};

// Validates a major-unit decimal string ("1500.50") against the minor units of
// the currency named by a sibling property.
export function IsMoneyString(
  currencyProperty = 'currency_code',
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isMoneyString',
      target: object.constructor,
      propertyName,
      constraints: [currencyProperty],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          return (
            typeof value === 'string' &&
            moneyRegex(minorUnitsFor(args)).test(value)
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a decimal string with at most ${minorUnitsFor(args)} decimal places`;
        },
      },
    });
  };
}
