"use client";

import * as React from "react";
import { Link } from "@/i18n/routing";

import { cn } from "@repo/ui/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@repo/ui/navigation-menu";
import { Button } from "@repo/ui/button";
import { Logo } from "@repo/ui/logo";
import { useTranslations } from "next-intl";
import ChangeTranslation from "./change-translation";

const Navigation = ({ className = "" }: { className?: string }) => {
  const t = useTranslations("header");
  return (
    <NavigationMenu className={cn("", className)}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent hover:bg-white/10 focus:bg-white/10 data-[state=open]:bg-white/10">
            {t("groups.students")}
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-3 p-6 md:w-[400px]">
              <li className="row-span-3">
                <NavigationMenuLink asChild>
                  <Link
                    className="flex h-full w-full select-none flex-col justify-end rounded-md bg-muted p-6 no-underline outline-none focus:shadow-md"
                    href="/"
                  >
                    {/* The white mark was being `invert`ed to black on this
                        light card; there is a real navy one for this ground. */}
                    <Logo
                      variant="icon"
                      width={56}
                      alt=""
                      className="size-14"
                    />
                    <div className="mb-2 mt-4 text-lg font-medium">
                      {t("pages.home.title")}
                    </div>
                    <p className="text-sm leading-tight text-muted-foreground">
                      {t("pages.home.description")}
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              <ListItem href="/student" title={t("pages.student.title")}>
                {t("pages.student.description")}
              </ListItem>
              <ListItem href="/incommings" title={t("pages.incomming.title")}>
                {t("pages.incomming.description")}
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            className={cn(navigationMenuTriggerStyle(), "hover:bg-white/10")}
            asChild
          >
            <Link href={"/company"}>{t("groups.companies")}</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            className={cn(navigationMenuTriggerStyle(), "hover:bg-white/10")}
            asChild
          >
            <Link href={"/blog"}>{t("pages.blog.name")}</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <ChangeTranslation className="hidden bg-transparent hover:bg-white/10 focus:bg-white/10 data-[state=open]:bg-white/10 md:flex" />
        <NavigationMenuItem asChild>
          <Button
            asChild
            className="ml-2 bg-white text-primary shadow-sm hover:bg-white/90"
          >
            <Link href="#contact-form">{t("contact-btn")}</Link>
          </Button>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
};

export default Navigation;

const ListItem = ({
  title,
  href,
  children,
  className = "",
}: {
  title: string;
  href: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className,
          )}
          href={href}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
};
ListItem.displayName = "ListItem";
