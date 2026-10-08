import { Card } from "@repo/ui/card";
import { Quote } from "lucide-react";
import Image from "next/image";

import { Link } from "@/i18n/routing";
import type { ExperienceSummary } from "@/lib/experiences";

import { quoted } from "./format";

/**
 * One student's story as a card: photo, quote, and who said it. The name is
 * the link, stretched over the whole card.
 */
export function ExperienceCard({
  experience,
  headingLevel: Heading,
  fallbackLabel,
  sizes,
}: {
  experience: ExperienceSummary;
  headingLevel: "h2" | "h3";
  fallbackLabel: string;
  sizes: string;
}) {
  const { photo, contentLocale } = experience;
  const rendition = photo ? (photo.card ?? photo.original) : null;
  const caption = experience.role ?? experience.degree;

  return (
    <Card className="group relative flex h-full flex-col p-0 transition-colors hover:border-primary/30 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring has-[a:focus-visible]:ring-offset-2">
      <div className="relative aspect-[16/9] overflow-hidden bg-primary/8">
        {photo && rendition ? (
          <Image
            src={rendition.url}
            alt={photo.alt}
            fill
            sizes={sizes}
            className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.03]"
          />
        ) : (
          <div
            aria-hidden
            className="grid h-full place-items-center text-primary/40"
          >
            <Quote size={40} />
          </div>
        )}
        {experience.isFallback && (
          <span className="absolute top-3 left-3 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground lowercase">
            {fallbackLabel}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        {/* The name comes first in the source so a screen reader jumping
            between headings hears whose story it is before the quote; `order`
            puts the quote first on screen. */}
        <div className="order-2 mt-auto pt-6">
          <Heading className="leading-snug font-semibold">
            <Link
              href={`/experiences/${experience.slug}`}
              className="after:absolute after:inset-0 focus-visible:outline-none"
            >
              {experience.studentName}
            </Link>
          </Heading>
          {caption && (
            <p
              lang={contentLocale}
              className="mt-1 text-sm leading-relaxed text-muted-foreground"
            >
              {caption}
            </p>
          )}
        </div>
        <blockquote
          lang={contentLocale}
          className="order-1 text-lg leading-snug font-semibold tracking-tight text-pretty"
        >
          <p>{quoted(experience.quote, contentLocale)}</p>
        </blockquote>
      </div>
    </Card>
  );
}
