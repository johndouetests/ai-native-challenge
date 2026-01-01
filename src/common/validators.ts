import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export const MAX_POINTS = 1_000_000;
export const MAX_AMOUNT_MINOR = 100_000_000;

/** The property may only be present when `discriminator` equals `value`. */
export function OnlyWhen(discriminator: string, value: string, options?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'onlyWhen',
      target: target.constructor,
      propertyName,
      options,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          return (args.object as Record<string, unknown>)[discriminator] === value;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} is only allowed when ${discriminator} is "${value}"`;
        },
      },
    });
  };
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

export function isValidCalendarDate(dateOnly: string): boolean {
  const [y, m, d] = dateOnly.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isDateOnly(value: string): boolean {
  return DATE_ONLY.test(value) && isValidCalendarDate(value);
}

export function isDateTimeWithOffset(value: string): boolean {
  return (
    DATE_TIME_WITH_OFFSET.test(value) &&
    isValidCalendarDate(value.slice(0, 10)) &&
    !Number.isNaN(new Date(value).getTime())
  );
}

/** `YYYY-MM-DD` or an ISO 8601 date-time with `Z` or an explicit offset. */
export function IsDateOrDateTime(options?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'isDateOrDateTime',
      target: target.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && (isDateOnly(value) || isDateTimeWithOffset(value));
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be YYYY-MM-DD or an ISO 8601 date-time with Z or an offset`;
        },
      },
    });
  };
}
