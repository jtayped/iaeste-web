"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { SidebarMenuButton } from "@repo/ui/sidebar";

import { applyTheme, readStoredTheme, type Theme } from "@/lib/theme";

/**
 * Light/dark switch for the sidebar footer.
 *
 * The DOM is already correct before this mounts — `themeInitScript` in the
 * root layout set the class. This component only needs to know which label to
 * show, so it reads the stored value in an effect rather than during render:
 * reading `localStorage` while rendering would diverge from the server's HTML
 * and trip a hydration mismatch. Until that effect runs, the label renders as
 * light, which is the default anyway.
 */
export function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>("light");

  React.useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <SidebarMenuButton
      onClick={() => {
        applyTheme(next);
        setTheme(next);
      }}
      tooltip={next === "dark" ? "mode fosc" : "mode clar"}
      aria-label={
        next === "dark" ? "activa el mode fosc" : "activa el mode clar"
      }
    >
      {theme === "dark" ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
      <span>{next === "dark" ? "mode fosc" : "mode clar"}</span>
    </SidebarMenuButton>
  );
}
