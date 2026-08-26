import { parsePhoneNumberWithError, type CountryCode } from "libphonenumber-js";

/**
 * IAESTE LC Lleida is a Lleida-based student organisation, so a phone number
 * submitted without a country code is assumed to be Spanish. A number that
 * already carries an explicit `+` country code (e.g. a UdL exchange
 * student's home-country number) is parsed strictly as international and
 * never coerced to `ES` — this is what lets that number through instead of
 * being rejected as "not a valid Spanish number".
 */
const DEFAULT_COUNTRY: CountryCode = "ES";

export interface ParsedPhone {
  /** E.164, e.g. `+34623324234`. Stored as `phoneE164`. */
  e164: string;
  /** Human-readable, e.g. `+34 623 32 42 34`. Stored as `phoneDisplay`. */
  display: string;
}

/**
 * Parses and validates a submitted phone number. Returns `undefined` for
 * anything that doesn't parse as a plausible number rather than throwing —
 * callers decide how to surface that (a 422 at the request boundary, a
 * defensive `Error` deeper in the stack where the input should already be
 * valid).
 */
export function parsePhone(raw: string): ParsedPhone | undefined {
  const trimmed = raw.trim();

  try {
    const phoneNumber = trimmed.startsWith("+")
      ? parsePhoneNumberWithError(trimmed)
      : parsePhoneNumberWithError(trimmed, DEFAULT_COUNTRY);

    if (!phoneNumber.isValid()) return undefined;

    return {
      e164: phoneNumber.number,
      // `formatInternational()` over `formatNational()`: this may be read
      // by a non-Spanish exchange student, and an international-format
      // number (with its explicit country code) reads unambiguously to
      // anyone, whereas a national-format Spanish number would look
      // incomplete/wrong to someone dialling from abroad.
      display: phoneNumber.formatInternational(),
    };
  } catch {
    return undefined;
  }
}

export function isValidPhone(raw: string): boolean {
  return parsePhone(raw) !== undefined;
}
