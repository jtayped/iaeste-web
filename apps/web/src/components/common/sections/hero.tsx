import { cn } from "@repo/ui/lib/utils";
import Image from "next/image";
import React from "react";

/**
 * The site had four heroes: the home page's (a graded overlay over a sharp
 * photo, `h-svh`, sized CTAs), this one (a flat `bg-primary/60` over a
 * `blur-sm` photo, `h-screen`, default CTAs), the blog's navy band, and the
 * under-construction screen. This is the home page's treatment, generalised.
 *
 * What changed from the version this replaces, and why:
 *
 * - `h-svh` rather than `h-screen`, with a floor. `h-screen` is the *large*
 *   viewport on mobile, so the CTAs sat under Safari's toolbar.
 * - The photo is no longer blurred and no longer `fixed`. A `fixed` background
 *   behind a scrolling page is a parallax effect nobody asked for, and it
 *   forces the browser to repaint the image on every frame.
 * - `.hero-scrim` instead of a flat tint (see `globals.css`): a light wash so
 *   the photograph still reads as a photograph, plus a radial scrim behind the
 *   copy so the type keeps its ground. A flat tint heavy enough for the second
 *   job erases the first.
 * - `alt=""` by default. The photo is usually decoration, and it was
 *   announcing "hero background" ahead of the headline on four pages. Pages
 *   where the photograph *is* the subject pass `imageAlt`.
 */
const HeroSection = ({
  backgroundImage,
  imagePosition = "center",
  title,
  subtitle,
  description,
  component,
  credit,
  imageAlt = "",
  className = "",
}: {
  backgroundImage: string;
  /** Attribution for a licensed photograph, rendered at the foot of the band. */
  credit?: React.ReactNode;
  /** Empty for a decorative backdrop; set when the photo is the subject. */
  imageAlt?: string;
  /** `object-position` for the photo, when the subject is not centred. */
  imagePosition?: string;
  title: string;
  subtitle?: string;
  description: string;
  component?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("relative isolate", className)}>
      <Image
        src={backgroundImage}
        alt={imageAlt}
        fill
        sizes="100vw"
        quality={85}
        priority
        className="-z-10 object-cover"
        style={{ objectPosition: imagePosition }}
      />
      {/* `pt-20` clears the fixed header so the block sits on the optical
          centre rather than the geometric one. */}
      <div className="section-padding hero-scrim relative flex h-svh min-h-[34rem] items-center justify-center pt-20 text-primary-foreground">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h1 className="text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] text-balance sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {/* The deck, not an eyebrow. Both pages had a `subtitle` written and
              translated in all three locales that the old hero accepted as a
              prop and neither page ever passed. */}
          {subtitle && (
            <p className="mt-5 max-w-2xl text-xl leading-snug text-balance text-primary-foreground sm:text-2xl">
              {subtitle}
            </p>
          )}
          <p className="mt-5 max-w-2xl leading-relaxed text-pretty text-primary-foreground/85">
            {description}
          </p>
          {component && <div className="mt-9">{component}</div>}
        </div>
        {credit && (
          <div className="absolute inset-x-0 bottom-0 px-4 pb-3 text-center text-[11px] text-primary-foreground/50">
            {credit}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroSection;
