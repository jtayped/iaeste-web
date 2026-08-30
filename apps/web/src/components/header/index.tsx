"use client";
import { Link } from "@/i18n/routing";
import { cn } from "@repo/ui/lib/utils";
import { Logo } from "@repo/ui/logo";
import React, { createContext, useEffect, useState } from "react";
import Sidebar from "./sidebar";
import Navigation from "./navigation";

interface NavigationContextValue {
  isScrolled: boolean;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(
  undefined,
);

export const NavigationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    // Check the scroll position when the component mounts
    const checkScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    // Call it immediately to set the initial state
    checkScroll();

    // Add the scroll event listener
    const handleScroll = () => {
      checkScroll();
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const value: NavigationContextValue = {
    isScrolled,
    isSidebarOpen,
    toggleSidebar,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export function useNavigation() {
  const value = React.useContext(NavigationContext);

  if (value === undefined) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }

  return value;
}

const Header = () => {
  const { isScrolled } = useNavigation();

  return (
    <header
      className={cn(
        "section-padding fixed top-0 z-50 flex w-full items-center justify-between border-b text-primary-foreground transition-[background-color,padding,border-color] duration-300",
        isScrolled
          ? "border-white/10 bg-primary/85 py-3 backdrop-blur-md"
          : "border-transparent py-6",
      )}
    >
      <Link href="/" aria-label="iaeste lc lleida">
        {/* Fixed intrinsic size so the srcset never changes; only the CSS
            width animates, which keeps the swap from flashing. The link
            already carries the name, so the mark itself is decorative. */}
        <Logo
          variant="horizontal"
          color="white"
          width={170}
          alt=""
          priority
          className="transition-[width] duration-300"
          style={{ width: isScrolled ? "132px" : "170px" }}
        />
      </Link>

      <Sidebar className="block md:hidden" />
      <Navigation className="hidden md:block" />
    </header>
  );
};

export default Header;
