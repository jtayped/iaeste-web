import "@repo/ui/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "inscriu-te | iaeste lc lleida",
  description: "uneix-te al comitè local d'iaeste lleida",
  openGraph: {
    title: "inscriu-te | iaeste lc lleida",
    description: "uneix-te al comitè local d'iaeste lleida",
    url: "https://iaestelleida.cat/",
    type: "website",
    images: [
      {
        url: "https://iaestelleida.cat/twitter.png",
        width: 700,
        height: 350,
        alt: "inscriu-te | iaeste lc lleida",
      },
    ],
    siteName: "inscriu-te | iaeste lc lleida",
  },
  twitter: {
    card: "summary_large_image",
    title: "inscriu-te | iaeste lc lleida",
    description: "uneix-te al comitè local d'iaeste lleida",
    creator: "@IAESTELCLleida",
    site: "@IAESTELCLleida",
    images: ["https://iaestelleida.cat/twitter.png"],
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
          <div className="mx-auto w-full px-4 md:w-[600px]">{children}</div>
        </div>
      </body>
    </html>
  );
}
