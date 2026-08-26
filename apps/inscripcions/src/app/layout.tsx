import "@repo/ui/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Inscriu-te | IAESTE LC Lleida",
  description: "Uneix-te al nostre equip!",
  openGraph: {
    title: "Inscriu-te | IAESTE LC Lleida",
    description: "Uneix-te al nostre equip!",
    url: "https://iaestelleida.cat/",
    type: "website",
    images: [
      {
        url: "https://iaestelleida.cat/twitter.png",
        width: 700,
        height: 350,
        alt: "Inscriu-te | IAESTE LC Lleida",
      },
    ],
    siteName: "Inscriu-te | IAESTE LC Lleida",
  },
  twitter: {
    card: "summary_large_image",
    title: "Inscriu-te | IAESTE LC Lleida",
    description: "Uneix-te al nostre equip!",
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
        <div className="flex h-screen w-full justify-center">
          <div className="mx-auto w-full px-4 md:w-[600px]">{children}</div>
        </div>
      </body>
    </html>
  );
}
