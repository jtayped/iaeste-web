#!/usr/bin/env node
/**
 * Regenerates every derived brand asset in the repo from the masters in
 * `assets/brand/source/`.
 *
 * Run from anywhere:  node assets/brand/generate-brand.mjs
 *
 * Everything it writes is derived, so the outputs are safe to delete and
 * rebuild. The masters are not: `source/icon-navy.svg` is the true vector of
 * the IAESTE LC Lleida emblem (globe + book + wreath with the Seu Vella tower
 * merged in) and `source/wordmark-horizontal.png` is the only master of the
 * lockup that carries the "IAESTE / LC LLEIDA" lettering — there is no vector
 * of the text, so the wordmark is downsampled from a 7011px raster rather
 * than re-typeset.
 *
 * The horizontal lockup is not a straight downsample of that master. The
 * master pairs the lettering with the *international* IAESTE emblem, which
 * has no Seu Vella tower, so this script keeps the master's lettering
 * untouched and swaps in the Lleida emblem from the vector — see
 * `horizontalLockup` for the measurements.
 *
 * Requires `rsvg-convert` (librsvg) and `magick` (ImageMagick 7) on PATH.
 */

import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import os from "node:os";

const run = promisify(execFile);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const SOURCE = path.join(HERE, "source");
const FONTS = path.join(HERE, "fonts");

/**
 * The one brand navy. It is the same value as the shared `--primary` token
 * (`202 78% 20%` in packages/ui/src/globals.css) so an icon sitting next to a
 * `bg-primary` surface does not read as two different blues. The Illustrator
 * masters carry a marginally different #0B3D59, which is reconciled here
 * rather than in the master.
 */
const NAVY = "#0B3E5B";
const WHITE = "#FFFFFF";

/**
 * The emblem's ink occupies 142..1810 x 54..1938 of the master's 2000x2000
 * viewBox — noticeably off-centre and with a lot of slack on the sides. This
 * is the tightest square that contains it, centred on the ink, so every
 * derived square renders the mark as large as the canvas allows instead of
 * inheriting the master's arbitrary padding.
 */
const TIGHT_VIEWBOX = "34 54 1884 1884";

/** The same ink with no squaring-up, for use inside a horizontal lockup. */
const INK_VIEWBOX = "142 54 1668 1884";

/**
 * Everything needed to rebuild the horizontal lockup, in pixels of the
 * trimmed master (`wordmark-horizontal.png` trims to 6816x2010).
 *
 * `text` is the lettering block lifted verbatim from the master. `emblem` is
 * the replacement Lleida mark: it is rendered to the master emblem's full
 * height so the lockup keeps the master's proportions, and `gap` is the
 * master's own emblem-to-lettering distance.
 */
const LOCKUP = {
  text: { x: 2277, y: 137, w: 4539, h: 1691 },
  emblem: { w: 1779, h: 2010 },
  gap: 409,
};

/**
 * Every app gets the same favicon and installed-icon set, under the same
 * filenames, so each app's metadata block can be a copy of the others'.
 *
 * `brand` adds `public/brand/` — the mark and the lockup, for anything that
 * renders a logo in the page. `og` adds the share card's photograph and the
 * two Inter weights it is set in. Admin renders no logo of its own today but
 * keeps `brand` so `<Logo/>` resolves the day someone drops one in; it has no
 * `og` because it is behind a session and marked `noindex`. The CMS gets
 * neither: only the Payload panel's own chrome is ours to brand.
 */
const APPS = {
  web: { brand: true, og: true },
  admin: { brand: true, og: false },
  inscripcions: { brand: true, og: true },
  cms: { brand: false, og: false },
};

/**
 * Fraction of the canvas the glyph occupies on an opaque plate.
 *
 * `PLATE` is the ordinary app-icon inset. `MASKABLE` is tighter because
 * Android may crop an installed icon to a circle: the PWA maskable convention
 * only guarantees the middle 80% survives, and a line-art emblem that gets
 * clipped mid-wreath looks broken rather than cropped.
 */
const INSET = { PLATE: 0.72, MASKABLE: 0.66 };

async function sh(cmd, args) {
  try {
    return await run(cmd, args, { maxBuffer: 1 << 26 });
  } catch (error) {
    throw new Error(`${cmd} ${args.join(" ")}\n${error.stderr ?? error.message}`);
  }
}

/**
 * Repaints the master emblem in a single colour and crops it to `TIGHT_VIEWBOX`.
 *
 * The master paints the mark in 15 navy paths plus 5 white ones that sit
 * underneath and never surface in a render, so collapsing every `fill` onto
 * one colour is lossless and gives a mark that works as ink on any ground —
 * which is what the inverted (white-on-navy) app icons need.
 */
function recolour(svg, colour, viewBox = TIGHT_VIEWBOX) {
  return (
    svg
      .replace(/\s(width|height)="[^"]*"/g, "")
      .replace(/viewBox="0 0 2000 2000"/, `viewBox="${viewBox}"`)
      .replace(/fill="rgb\([^)]*\)"/g, `fill="${colour}"`)
      // pdftocairo emits six decimals per coordinate, which triples the file
      // for sub-thousandth-of-a-pixel accuracy nobody can see. Rounding to two
      // is 0.0001 of the 2000-unit viewBox and halves the favicon. Confined to
      // path data so it cannot touch `version="1.0"` in the XML declaration.
      .replace(/ d="([^"]*)"/g, (_, d) =>
        ` d="${d.replace(/\d+\.\d+/g, (n) => String(Math.round(Number(n) * 100) / 100))}"`,
      )
  );
}

/** Renders the recoloured emblem to a transparent square PNG of `size` px. */
async function glyphPng(svgPath, size, out) {
  await sh("rsvg-convert", ["-w", String(size), "-h", String(size), svgPath, "-o", out]);
  return out;
}

/** Emblem on an opaque navy plate — the treatment every installed icon uses. */
async function platedIcon(whiteSvg, size, inset, out, tmp) {
  const glyph = path.join(tmp, `glyph-${size}-${inset}.png`);
  await glyphPng(whiteSvg, Math.round(size * inset), glyph);
  await sh("magick", [
    "-size", `${size}x${size}`, `xc:${NAVY}`,
    glyph, "-gravity", "center", "-composite",
    "-depth", "8", "-strip", out,
  ]);
}

/**
 * The vector equivalent of `platedIcon`: a navy square with the white glyph
 * inset and centred, at the same fraction `platedIcon` uses on a raster.
 *
 * Takes the already-recoloured white SVG string (tight-viewboxed, so its
 * coordinate space is exactly `TIGHT_VIEWBOX`) and wraps its paths in a
 * `<g>` that scales them toward the viewBox's own centre — the same square
 * `platedIcon` composites onto, just done with a transform instead of
 * ImageMagick, so it stays crisp at any size a browser tab renders it at.
 */
function platedIconSvg(whiteSvg, inset) {
  const [, vx, vy, vw, vh] = TIGHT_VIEWBOX.match(/(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)/).map(Number);
  const cx = vx + vw / 2;
  const cy = vy + vh / 2;
  const inner = whiteSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${TIGHT_VIEWBOX}">
<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${NAVY}"/>
<g transform="translate(${cx} ${cy}) scale(${inset}) translate(${-cx} ${-cy})">${inner}</g>
</svg>
`;
}

/** Recolours an RGBA raster to a flat colour, keeping its antialiased alpha. */
async function tint(src, colour, out, extra = []) {
  await sh("magick", [
    src, "-trim", "+repage",
    "-channel", "RGB", "-fill", colour, "-colorize", "100", "+channel",
    ...extra, "-depth", "8", "-strip", out,
  ]);
}

/**
 * Rebuilds the horizontal lockup with the Lleida emblem in place of the
 * international one the master ships, then writes it in `colour` at `width`.
 */
async function horizontalLockup(inkSvg, colour, width, out, tmp) {
  const { text, emblem, gap } = LOCKUP;
  const trimmed = path.join(tmp, "wordmark-trim.png");
  const letters = path.join(tmp, "wordmark-letters.png");
  const mark = path.join(tmp, `lockup-emblem.png`);

  await sh("magick", [
    path.join(SOURCE, "wordmark-horizontal.png"), "-trim", "+repage", trimmed,
  ]);
  await sh("magick", [
    trimmed, "-crop", `${text.w}x${text.h}+${text.x}+${text.y}`, "+repage", letters,
  ]);
  await sh("rsvg-convert", [
    "-w", String(emblem.w), "-h", String(emblem.h), inkSvg, "-o", mark,
  ]);

  const canvasW = emblem.w + gap + text.w;
  await sh("magick", [
    "-size", `${canvasW}x${emblem.h}`, "xc:none",
    mark, "-geometry", "+0+0", "-composite",
    letters, "-geometry", `+${emblem.w + gap}+${text.y}`, "-composite",
    "-channel", "RGB", "-fill", colour, "-colorize", "100", "+channel",
    "-resize", `${width}x`, "-depth", "8", "-strip", out,
  ]);
}

async function main() {
  const tmp = await import("node:fs/promises").then((fs) =>
    fs.mkdtemp(path.join(os.tmpdir(), "brand-")),
  );

  const master = await readFile(path.join(SOURCE, "icon-navy.svg"), "utf8");
  const navySvg = path.join(tmp, "icon-navy.svg");
  const whiteSvg = path.join(tmp, "icon-white.svg");
  const inkSvg = path.join(tmp, "icon-ink.svg");
  const whiteSvgString = recolour(master, WHITE);
  await writeFile(navySvg, recolour(master, NAVY));
  await writeFile(whiteSvg, whiteSvgString);
  await writeFile(inkSvg, recolour(master, NAVY, INK_VIEWBOX));

  // ---- shared /brand folder -------------------------------------------------
  const brand = path.join(tmp, "brand");
  await mkdir(brand, { recursive: true });
  await copyFile(navySvg, path.join(brand, "icon-navy.svg"));
  await copyFile(whiteSvg, path.join(brand, "icon-white.svg"));
  // Rasters exist so `next/image` can optimise the mark without the app
  // needing `dangerouslyAllowSVG`, and so email clients (which will not render
  // an SVG) have something to point at.
  await glyphPng(navySvg, 512, path.join(brand, "icon-navy.png"));
  await glyphPng(whiteSvg, 512, path.join(brand, "icon-white.png"));

  // 1600px is ~5x the widest place the lockup is used (a ~320px footer mark),
  // so it still has headroom on a 3x display without shipping a print master
  // into three `public/` folders.
  await horizontalLockup(inkSvg, NAVY, 1600, path.join(brand, "wordmark-horizontal-navy.png"), tmp);
  await horizontalLockup(inkSvg, WHITE, 1600, path.join(brand, "wordmark-horizontal-white.png"), tmp);

  // ---- favicon / app icon set ----------------------------------------------
  const icons = path.join(tmp, "icons");
  await mkdir(icons, { recursive: true });
  // Plated like every other installed icon (see the favicon.ico comment
  // below) rather than transparent ink, so a browser that prefers this SVG
  // over favicon.ico doesn't regain the dark-chrome problem the .ico just
  // fixed.
  await writeFile(path.join(icons, "icon.svg"), platedIconSvg(whiteSvgString, INSET.PLATE));

  // Browser tabs sit on both light and dark chrome. Ink-on-transparent reads
  // fine on a light tab but nearly disappears on a dark one — dark tab bars
  // are close to this same navy — so the favicon gets the same opaque plate
  // as every installed icon rather than being the one place the mark has to
  // survive an unknown background unaided.
  const icoParts = [];
  for (const size of [16, 32, 48]) {
    const out = path.join(tmp, `fav-${size}.png`);
    await platedIcon(whiteSvg, size, INSET.PLATE, out, tmp);
    icoParts.push(out);
  }
  await sh("magick", [...icoParts, path.join(icons, "favicon.ico")]);

  // Installed icons are opaque by rule on iOS and by convention everywhere
  // else. Navy plate + white mark, which is also how the mark reads over the
  // site's own `bg-primary/60` hero.
  await platedIcon(whiteSvg, 180, INSET.PLATE, path.join(icons, "apple-touch-icon.png"), tmp);
  await platedIcon(whiteSvg, 192, INSET.PLATE, path.join(icons, "icon-192.png"), tmp);
  await platedIcon(whiteSvg, 512, INSET.PLATE, path.join(icons, "icon-512.png"), tmp);
  await platedIcon(whiteSvg, 512, INSET.MASKABLE, path.join(icons, "icon-maskable-512.png"), tmp);

  // ---- what the shared OG renderer reads -----------------------------------
  // Satori needs the actual bytes, and the one path an app can resolve
  // identically under `next dev`, `next start` and the standalone server is
  // `process.cwd()/public` — the standalone entrypoint chdir's to the app
  // directory, and the Dockerfiles copy `public/` in beside it. So these go in
  // `public/` like everything else rather than into the shared package.
  //
  // The source is the homepage hero photo, cropped to the card ratio. The
  // offset keeps the subject whole; a centre crop cuts her off at the
  // shoulders.
  const ogBackground = path.join(tmp, "og-background.jpg");
  await sh("magick", [
    path.join(REPO, "apps/web/public/hero.jpg"),
    "-resize", "1200x", "-crop", "1200x630+0+240", "+repage",
    "-quality", "82", "-strip", ogBackground,
  ]);

  // ---- fan out into every app ----------------------------------------------
  for (const [app, wants] of Object.entries(APPS)) {
    const pub = path.join(REPO, "apps", app, "public");
    for (const file of [
      "favicon.ico", "icon.svg", "apple-touch-icon.png",
      "icon-192.png", "icon-512.png", "icon-maskable-512.png",
    ]) {
      await copyFile(path.join(icons, file), path.join(pub, file));
    }

    await rm(path.join(pub, "brand"), { recursive: true, force: true });
    if (!wants.brand) continue;

    await mkdir(path.join(pub, "brand"), { recursive: true });
    for (const file of [
      "icon-navy.svg", "icon-white.svg",
      "icon-navy.png", "icon-white.png",
      "wordmark-horizontal-navy.png", "wordmark-horizontal-white.png",
    ]) {
      await copyFile(path.join(brand, file), path.join(pub, "brand", file));
    }

    if (!wants.og) continue;

    await mkdir(path.join(pub, "brand", "fonts"), { recursive: true });
    await copyFile(ogBackground, path.join(pub, "brand", "og-background.jpg"));
    // Full latin, not a subset. A title is translated copy anyone on the
    // committee can edit, and a subset turns the first unplanned character
    // into a tofu box in an image nobody looks at before it is shared.
    for (const font of ["Inter-Regular.ttf", "Inter-ExtraBold.ttf"]) {
      await copyFile(path.join(FONTS, font), path.join(pub, "brand", "fonts", font));
    }
  }

  await rm(tmp, { recursive: true, force: true });
  console.log(`brand assets regenerated for: ${Object.keys(APPS).join(", ")}`);
}

await main();
