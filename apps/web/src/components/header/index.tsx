"use client";
import { Link } from "@/i18n/routing";
import Image from "next/image";
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
      className={`section-padding fixed top-0 z-50 flex w-full items-center justify-between text-primary-foreground transition-all duration-300 ${isScrolled ? "bg-primary py-2 shadow-lg" : "py-10"} `}
    >
      <Link href="/">
        <Image
          src={"/logos/horizontal.png"}
          alt={"iaeste logo"}
          width={isScrolled ? 160 : 255}
          height={isScrolled ? 40 : 75}
          className="transition-all duration-300"
          style={{
            width: isScrolled ? "160px" : "255px",
            height: "auto",
          }}
        />
      </Link>

      <Sidebar className="block md:hidden" />
      <Navigation className="hidden md:block" />
    </header>
  );
};

export default Header;
