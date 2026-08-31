import "@repo/ui/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { brandIcons, brandSocialHandle } from "@repo/ui/lib/brand-metadata";

const title = "inscriu-te | iaeste lc lleida";
const description = "uneix-te al comitè local d'iaeste lleida";

export const metadata: Metadata = {
  // This app has its own origin. It used to point its share card at
  // `iaestelleida.cat/twitter.png` — a file in a different app's `public/`,
  // which meant no preview deploy of this app ever previewed its own card.
  // `opengraph-image.tsx` now renders one here, and this is what Next resolves
  // its URL against.
  metadataBase: new URL("https://inscripcions.iaestelleida.cat"),
  title,
  description,
  applicationName: "Inscripcions · IAESTE LC Lleida",
  manifest: "/manifest.webmanifest",
  icons: brandIcons,
  openGraph: {
    title,
    description,
    url: "/",
    type: "website",
    siteName: title,
  },
  twitter: {
    // The `opengraph-image` file convention fills in the image but not the
    // card type, so this stays explicit.
    card: "summary_large_image",
    title,
    description,
    creator: brandSocialHandle,
    site: brandSocialHandle,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ca" className={`${GeistSans.variable}`}>
      <body className="bg-primary/10">
        <div className="flex min-h-dvh w-full justify-center">
          <div className="mx-auto w-full max-w-[640px] px-4 sm:px-6">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
