export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "iaeste-admin-theme";

/**
 * Runs before first paint, injected into `<head>` by the root layout.
 *
 * Without it the page always renders light and then flips on hydration, which
 * is a visible white flash for anyone who chose dark. It is inline and
 * synchronous for the same reason — an external or deferred script is already
 * too late.
 *
 * Light is the default: an unset or unreadable preference paints light, and
 * only an explicit `"dark"` adds the class. `localStorage` throws outright in
 * some privacy configurations rather than returning null, hence the catch.
 */
export const themeInitScript = `
(function () {
  try {
    if (localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
`.trim();

/** Reads the persisted preference, falling back to light. */
export function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

/** Applies `theme` to `<html>` and persists it. Persistence is best-effort. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // A blocked storage API costs the user persistence across reloads, not
    // the toggle itself. Nothing to report and nothing to recover.
  }
}
