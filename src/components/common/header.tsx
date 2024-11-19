"use client";

import { Link } from "@/i18n/routing";
import { Page } from "@/types/pages";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { useTranslations } from "next-intl";

const pages: Page[] = [
  {
    href: "/student",
    key: "student",
    pages: [{ href: "/incommings", key: "incommings" }],
  },
  { href: "/company", key: "company" },
];

const HeaderItem = ({ page }: { page: Page }) => {
  const t = useTranslations("header.pages");

  const renderMenuItems = (pages: Page[]) => (
    <ul className="grid gap-3 p-4">
      {pages.map((p, index) => (
        <ListItem key={index} href={p.href} title={t(`${p.key}.name`)}>
          {p.pages ? t(`${page.key}.description`) : ""}
        </ListItem>
      ))}
    </ul>
  );

  if (!page.pages || page.pages.length === 0) {
    return (
      <NavigationMenuItem>
        <Link href={page.href} legacyBehavior passHref>
          <NavigationMenuLink className={navigationMenuTriggerStyle()}>
            {t(`${page.key}.name`)}
          </NavigationMenuLink>
        </Link>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger>{t(`${page.key}.name`)}</NavigationMenuTrigger>
      <NavigationMenuContent>
        {renderMenuItems(page.pages)}
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
};

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { title: string }
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors"
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          {children && (
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
              {children}
            </p>
          )}
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`
        fixed top-0 w-full flex justify-between items-center 
        transition-all duration-300 z-50 px-screen  
        ${isScrolled ? "py-2 bg-primary shadow-lg" : "py-10"}
      `}
    >
      <Link href={"/"}>
        <Image
          src={"/logos/horizontal.png"}
          alt={"Logo"}
          width={isScrolled ? 160 : 255}
          height={isScrolled ? 40 : 75}
          className="transition-all duration-300"
        />
      </Link>
      <NavigationMenu
        className={`
          text-white 
          ${isScrolled ? "text-white" : "text-white"}
        `}
      >
        <NavigationMenuList>
          {pages.map((p, i) => (
            <HeaderItem page={p} key={i} />
          ))}
          <NavigationMenuItem>
            <Button
              className="ml-3"
              variant={isScrolled ? "secondary" : "default"}
              asChild
            >
              <Link href={"#contact"}>Contact</Link>
            </Button>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  );
};

export default Header;
