import "@repo/ui/globals.css";

import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";

import { Toaster } from "@repo/ui/toast";

import { Providers } from "@/app/providers";
import { adminTitle } from "@/lib/page-title";
import { themeInitScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: {
    // Only reached by a route that exports no title of its own. Every page
    // does (via `adminMetadata`), so this is the backstop, not the norm.
    default: adminTitle("iaeste lleida"),
    template: "dashboard · %s",
  },
  description: "gestió del comitè local d'iaeste lleida",
  applicationName: "IAESTE Lleida · Admin",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Admin", statusBarStyle: "default" },
  // An internal tool behind a session. Keeping it out of every index is
  // cheap and there is no reason for it to be findable.
  robots: { index: false, follow: false },
};

/**
 * `viewportFit: "cover"` so the installed PWA paints under the notch, and
 * `themeColor` matched per scheme to `--background` — an installed app whose
 * status bar is the wrong colour reads as a broken window frame.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020817" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ca" className={GeistSans.variable} suppressHydrationWarning>
      <head>
        {/* Sets the `dark` class before first paint so a dark-mode user never
            sees a white flash. It has to be inline and synchronous to beat
            the first paint; `suppressHydrationWarning` above is because this
            script mutates <html>'s className before React looks at it. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-background text-sm text-foreground antialiased">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
