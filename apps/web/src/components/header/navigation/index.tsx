"use client";

import * as React from "react";
import { Link } from "@/i18n/routing";

import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useNavigation } from "..";
import ChangeTranslation from "./change-translation";

const Navigation = ({ className = "" }: { className?: string }) => {
  const t = useTranslations("header");
  const { isScrolled } = useNavigation();

  return (
    <NavigationMenu className={cn("", className)}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>{t("groups.students")}</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-3 p-6 md:w-[400px]">
              <li className="row-span-3">
                <NavigationMenuLink asChild>
                  <Link
                    className="flex h-full w-full select-none flex-col justify-end rounded-md bg-muted p-6 no-underline outline-none focus:shadow-md"
                    href="/"
                  >
                    <Image
                      src="/logos/icon-lleida-white.png"
                      width={56}
                      height={56}
                      alt="IAESTE Square Logo"
                      className="invert h-14 w-14"
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
              <ListItem href="/incomming" title={t("pages.incomming.title")}>
                {t("pages.incomming.description")}
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <Link href="/company" legacyBehavior passHref>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              {t("groups.companies")}
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
        <ChangeTranslation className="hidden md:flex" />
        <NavigationMenuItem asChild>
          <Button
            size="lg"
            asChild
            variant={isScrolled ? "secondary" : "default"}
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
            className
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
