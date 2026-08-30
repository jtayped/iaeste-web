import {
  ogImageContentType,
  ogImageSize,
  renderOgImage,
} from "@repo/ui/lib/og-image";

export const size = ogImageSize;
export const contentType = ogImageContentType;
export const alt = "inscriu-te a iaeste lc lleida";

/**
 * One card for the whole app. Every screen here is a step of the same
 * single-locale flow, so there is nothing per-page to say.
 */
export default function OpengraphImage() {
  return renderOgImage("inscriu-te al comitè local");
}
