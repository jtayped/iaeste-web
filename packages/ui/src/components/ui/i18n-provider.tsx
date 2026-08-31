"use client";

import * as React from "react";
import { I18nProvider as HeroUII18nProvider } from "@heroui/react/rac";

/**
 * Tells React Aria which language its own widgets speak.
 *
 * Formatting is the part that matters here. Every date React Aria renders
 * itself — the calendar's month heading, its weekday row, a day cell's
 * announced label — goes through `Intl` with the locale it finds on this
 * context, and the default is the *browser's*. Left alone, a Catalan-only
 * admin panel opens a date picker that says "August 2026" and "Mon".
 *
 * It also fixes the first day of the week, which is a regional question
 * rather than a linguistic one — hence the region in the tag.
 *
 * React Aria ships no Catalan bundle of its own, so the handful of strings it
 * writes rather than formats (a nav button's "Previous", the "Today," that
 * prefixes today's cell) still come out in English. Those are passed in by
 * hand where they are rendered — see `calendar.tsx`.
 */
export function I18nProvider({
  locale,
  children,
}: {
  /** BCP-47 tag, e.g. `"ca-ES"`. */
  locale: string;
  children: React.ReactNode;
}) {
  return <HeroUII18nProvider locale={locale}>{children}</HeroUII18nProvider>;
}
