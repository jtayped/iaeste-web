import { ogImageContentType, ogImageSize } from "@repo/ui/lib/og-image";

import { generatePageOgImage } from "@/lib/metadata";

export const size = ogImageSize;
export const contentType = ogImageContentType;
export const alt = "iaeste lc lleida";

export default function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return generatePageOgImage({ params, pageKey: "StudentsPage" });
}
