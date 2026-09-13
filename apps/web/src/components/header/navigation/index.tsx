"use client";

import * as React from "react";
import { Link, usePathname } from "@/i18n/routing";

import { cn } from "@repo/ui/lib/utils";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@repo/ui/navigation-menu";
import { buttonVariants } from "@repo/ui/button";
import { useTranslations } from "next-intl";
import ChangeTranslation from "./change-translation";

/**
 * The same five destinations the mobile menu lists, in the same order.
 *
 * The desktop nav used to hide home, student and incoming inside an
 * "estudiants" dropdown — filing the home page under a student heading, and
 * incoming students under a menu that is not theirs — while the mobile menu
 * listed all five flat. The two also disagreed on what to call the companies
 * page: "companyies" on desktop, "empreses" on mobile.
 */
const PAGES = [
  { href: "/student", key: "student" },
  { href: "/company", key: "company" },
  { href: "/incommings", key: "incomming" },
  { href: "/blog", key: "blog" },
] as const;

const Navigation = ({ className = "" }: { className?: string }) => {
  const t = useTranslations("header");
  const pathname = usePathname();

  return (
    <NavigationMenu className={cn("", className)}>
      <NavigationMenuList>
        {PAGES.map((page) => {
          const isCurrent =
            page.href === "/blog"
              ? pathname.startsWith("/blog")
              : pathname === page.href;

          return (
            <NavigationMenuItem key={page.key}>
              <NavigationMenuLink
                className={cn(
                  navigationMenuTriggerStyle(),
                  "bg-transparent hover:bg-white/10 focus:bg-white/10",
                  /* There was no way to tell which page you were on. */
                  isCurrent && "bg-white/10",
                )}
                asChild
              >
                <Link
                  href={page.href}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {t(`pages.${page.key}.name`)}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
        <ChangeTranslation className="hidden bg-transparent hover:bg-white/10 focus:bg-white/10 data-[state=open]:bg-white/10 md:flex" />
        <NavigationMenuItem asChild>
          {/* Was a bare `#contact-form`, which only exists where a contact form
              is mounted — so on /blog, an article and /incommings the most
              prominent button in the header did nothing. */}
          <Link
            href="/student#contact-form"
            className={buttonVariants({
              variant: "onDark",
              className: "ml-2",
            })}
          >
            {t("contact-btn")}
          </Link>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
};

export default Navigation;
