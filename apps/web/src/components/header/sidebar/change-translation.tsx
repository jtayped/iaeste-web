import React from "react";
import Image from "next/image";
import { Link, routing, usePathname } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { locales } from "@/constants/locales";
import { cn } from "@repo/ui/lib/utils";

/**
 * Locale switcher for the mobile panel. A dropdown inside a full-screen sheet
 * meant two taps and a popover layered over an overlay; the three locales fit
 * on one row, so they are all just there.
 */
const ChangeTranslation = ({ className = "" }: { className?: string }) => {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {routing.locales.map((l) => {
        const meta = locales[l];
        if (!meta) return null;

        const isActive = l === locale;

        return (
          <Link
            key={l}
            href={pathname}
            locale={l}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-lg border text-[13px] transition-colors",
              isActive
                ? "border-white/60 bg-white/15 font-medium"
                : "border-white/15 text-primary-foreground/70 hover:bg-white/10",
            )}
          >
            <Image
              src={meta.svg}
              alt=""
              width={20}
              height={20}
              className="shrink-0 rounded-[3px]"
            />
            {meta.label}
          </Link>
        );
      })}
    </div>
  );
};

export default ChangeTranslation;
