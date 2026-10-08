import type { BlogLocale } from "@/lib/blog";

const intlLocales: Record<BlogLocale, string> = {
  ca: "ca-ES",
  es: "es-ES",
  en: "en-GB",
};

const quoteMarks: Record<BlogLocale, [string, string]> = {
  ca: ["«", "»"],
  es: ["«", "»"],
  en: ["“", "”"],
};

/**
 * The quote wrapped in the marks its own language uses. Marks an editor typed
 * at either end are dropped first so they are never doubled.
 */
export function quoted(text: string, locale: BlogLocale): string {
  const [open, close] = quoteMarks[locale];
  const bare = text.trim().replace(/^["«“]+|["»”]+$/g, "");
  return `${open}${bare}${close}`;
}

/**
 * Generated text is lowercased like the rest of the interface. Content typed
 * in the CMS is left as written.
 */
export function countryName(code: string, locale: BlogLocale): string {
  const tag = intlLocales[locale];
  const name = new Intl.DisplayNames([tag], { type: "region" }).of(code);
  return (name ?? code).toLocaleLowerCase(tag);
}

/** `YYYY-MM` as a UTC date, formatted in UTC, so no timezone shifts the month. */
function monthDate(yearMonth: string): Date {
  const year = Number(yearMonth.slice(0, 4));
  const month = Number(yearMonth.slice(5, 7));
  return new Date(Date.UTC(year, month - 1, 1, 12));
}

/**
 * "març del 2025 – agost del 2025", "March – August 2025": the locale decides
 * how a range collapses. Either end may be missing on its own.
 */
export function formatPeriod(
  start: string | null,
  end: string | null,
  locale: BlogLocale,
): string | null {
  const tag = intlLocales[locale];
  const format = new Intl.DateTimeFormat(tag, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  let text: string;
  if (start && end) {
    text = format.formatRange(monthDate(start), monthDate(end));
  } else if (start || end) {
    text = format.format(monthDate((start ?? end) as string));
  } else {
    return null;
  }
  return text.toLocaleLowerCase(tag);
}
