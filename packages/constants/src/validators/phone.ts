import { parsePhoneNumberWithError, type CountryCode } from "libphonenumber-js";

/**
 * IAESTE LC Lleida is based in Lleida, so numbers without a country code are
 * interpreted as Spanish. Numbers beginning with `+` keep their explicit
 * country code, which allows international students to use their home number.
 */
const DEFAULT_COUNTRY: CountryCode = "ES";

export interface ParsedPhone {
  /** E.164, for example `+34623324234`. */
  e164: string;
  /** International display form, for example `+34 623 32 42 34`. */
  display: string;
}

/** Parse and validate a submitted phone number without throwing. */
export function parsePhone(raw: string): ParsedPhone | undefined {
  const trimmed = raw.trim();

  try {
    const phoneNumber = trimmed.startsWith("+")
      ? parsePhoneNumberWithError(trimmed)
      : parsePhoneNumberWithError(trimmed, DEFAULT_COUNTRY);

    if (!phoneNumber.isValid()) return undefined;

    return {
      e164: phoneNumber.number,
      display: phoneNumber.formatInternational(),
    };
  } catch {
    return undefined;
  }
}

export function isValidPhone(raw: string): boolean {
  return parsePhone(raw) !== undefined;
}
