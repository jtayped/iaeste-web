import React from "react";
import Image from "next/image";
import { Link, routing } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { locales } from "@/constants/locales";
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from "@repo/ui/navigation-menu";
import { cn } from "@repo/ui/lib/utils";

const ChangeTranslation = ({ className = "" }: { className?: string }) => {
  const locale = useLocale();
  const pathname = usePathname();

  if (!locales[locale]) return;

  const { svg, label } = locales[locale];

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className={cn("", className)}>
        <Image
          src={svg}
          alt={label}
          width={24}
          height={24}
          className="rounded-sm"
        />
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid grid-cols-3 gap-3 p-6 md:w-[400px]">
          {routing.locales.map((l) => {
            if (!locales[l]) return;
            const { svg, label } = locales[l];
            return (
              <NavigationMenuLink key={l} asChild>
                <Link href={pathname} locale={l}>
                  <div className="bg-muted/70 p-4 hover:bg-muted">
                    <Image
                      src={svg}
                      alt={label}
                      width={46}
                      height={46}
                      className="rounded-sm"
                    />
                    <p className="mt-3 text-lg font-semibold">{label}</p>
                  </div>
                </Link>
              </NavigationMenuLink>
            );
          })}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
};

export default ChangeTranslation;
