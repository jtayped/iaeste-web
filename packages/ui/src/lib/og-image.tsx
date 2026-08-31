import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

/**
 * The share card, shared by the public site and the registration app.
 *
 * It is a deliberate restaging of the homepage hero rather than a new design:
 * the same photograph, the same graded navy wash, and the same wordmark built
 * from live type with the emblem set into it. A card that looks like the page
 * it opens is the whole point of the format.
 *
 * Apps cannot import each other's `src/`, so this lives in the shared package
 * and every `opengraph-image.tsx` in the repo is a four-line wrapper around it.
 */

/**
 * Bytes, not URLs. Satori needs the real font and image data, and a container
 * rendering a card has no origin it can reliably fetch itself from.
 *
 * They are read out of the calling app's own `public/`, which every app has an
 * identical copy of (written by `assets/brand/generate-brand.mjs`). That is the
 * one location `process.cwd()` resolves the same way under `next dev`, `next
 * build`, `next start` and the standalone server — the standalone entrypoint
 * chdir's to the directory holding `server.js`, and the Dockerfiles copy
 * `public/` in beside it. Bundler-relative alternatives do not survive the
 * trip: the compiler rewrites `new URL(…, import.meta.url)` into a browser
 * path under `/_next/static`, which no `fs` call can open.
 */
const brandAsset = (...segments: string[]) =>
  path.join(process.cwd(), "public", "brand", ...segments);

/** Brand navy, as satori needs it: `bg-primary` is a Tailwind token it cannot see. */
const NAVY = "11, 62, 91";

export const ogImageSize = { width: 1200, height: 630 };
export const ogImageContentType = "image/png";

function dataUri(buffer: Buffer, mime: string) {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

/**
 * Resolved once per server process. Between them the assets are about 950KB,
 * which is fine to hold but not fine to re-read on every crawler request.
 */
let assets: Promise<{
  background: string;
  emblem: string;
  regular: Buffer;
  extrabold: Buffer;
}> | null = null;

function loadAssets() {
  assets ??= (async () => {
    const [background, emblem, regular, extrabold] = await Promise.all([
      readFile(brandAsset("og-background.jpg")),
      readFile(brandAsset("icon-white.png")),
      readFile(brandAsset("fonts", "Inter-Regular.ttf")),
      readFile(brandAsset("fonts", "Inter-ExtraBold.ttf")),
    ]);
    return {
      background: dataUri(background, "image/jpeg"),
      emblem: dataUri(emblem, "image/png"),
      regular,
      extrabold,
    };
  })();
  return assets;
}

/**
 * Drops a leading "iaeste (lc) lleida" from a page title.
 *
 * The translated titles are written for a `<title>` tag, where repeating the
 * committee's name is correct. On the card the wordmark is already sitting
 * directly above the line, so "iaeste lleida — pràctiques internacionals per a
 * estudiants" says it twice. Anything that does not match this shape is left
 * exactly as written.
 */
function withoutBrandPrefix(title: string) {
  const stripped = title.replace(
    /^\s*iaeste\s+(?:lc\s+)?lleida\s*[-–—|·:]\s*/i,
    "",
  );
  return stripped.length > 0 ? stripped : title;
}

/**
 * The hero's wordmark, rebuilt in satori's subset of flexbox: "iaeste" at
 * display size, then "lc" and the emblem on one line with "lleida" under them.
 * Sizes are the hero's own `lg:` scale.
 */
function Wordmark({ emblem }: { emblem: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          display: "flex",
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: "-0.035em",
          lineHeight: 1,
        }}
      >
        iaeste
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
          <div
            style={{
              display: "flex",
              fontSize: 48,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            lc
          </div>
          {/* Not `next/image`: satori renders a bare <img> and nothing else. */}
          <img src={emblem} width={54} height={54} alt="" />
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          lleida
        </div>
      </div>
    </div>
  );
}

/** Renders the card for one page. `title` is that page's translated `ogTitle`. */
export async function renderOgImage(title: string) {
  const { background, emblem, regular, extrabold } = await loadAssets();

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        height: "100%",
        fontFamily: "Inter",
        color: "#ffffff",
        backgroundColor: `rgb(${NAVY})`,
      }}
    >
      {/* Not `next/image`: satori renders a bare <img> and nothing else. */}
      <img
        src={background}
        width={ogImageSize.width}
        height={ogImageSize.height}
        alt=""
        style={{ position: "absolute", top: 0, left: 0 }}
      />
      {/* The hero's graded wash, a few points deeper. The hero carries only
            display type over it; a 48px line needs more ground under it than a
            96px one. Darkest at the foot, where the photograph is brightest. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage: `linear-gradient(to bottom, rgba(${NAVY}, 0.80), rgba(${NAVY}, 0.72) 42%, rgba(${NAVY}, 0.90))`,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: "72px 96px",
        }}
      >
        <Wordmark emblem={emblem} />
        {/* Separates the identity from the message without adding a second
              typographic voice. */}
        <div
          style={{
            width: 72,
            height: 3,
            marginTop: 34,
            backgroundColor: "rgba(255, 255, 255, 0.55)",
          }}
        />
        <div
          style={{
            display: "flex",
            marginTop: 32,
            maxWidth: 880,
            fontSize: 48,
            fontWeight: 400,
            lineHeight: 1.28,
            textAlign: "center",
            color: "rgba(255, 255, 255, 0.95)",
          }}
        >
          {withoutBrandPrefix(title)}
        </div>
      </div>
    </div>,
    {
      ...ogImageSize,
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: extrabold, weight: 800, style: "normal" },
      ],
    },
  );
}
