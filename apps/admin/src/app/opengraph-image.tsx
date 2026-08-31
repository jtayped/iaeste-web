import {
  ogImageContentType,
  ogImageSize,
  renderOgImage,
} from "@repo/ui/lib/og-image";

export const size = ogImageSize;
export const contentType = ogImageContentType;
export const alt = "administració d'iaeste lc lleida";

export default function OpengraphImage() {
  return renderOgImage("administració del comitè local");
}
