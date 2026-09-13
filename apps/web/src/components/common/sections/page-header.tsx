import { cn } from "@repo/ui/lib/utils";
import React from "react";

/**
 * The navy band a page opens with when it has no photograph to open with.
 *
 * The blog index and the article template each spelled this out — `bg-primary
 * pt-40 pb-16 sm:pt-48 sm:pb-24` and `bg-primary pt-40 pb-20 sm:pt-48` — with
 * their own `max-w-*` shells and, on the index, an H1 at weight 700 where every
 * other H1 on the site is 800. One band now.
 *
 * The generous top padding is not decoration: the site header is `fixed`, so
 * the first 100px of every page is behind it.
 */
const PageHeader = ({
  title,
  deck,
  description,
  children,
  className = "",
}: {
  title: string;
  /** The lead line, between the heading and the supporting copy. */
  deck?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <section
      className={cn(
        "section-padding bg-primary pt-36 pb-16 text-primary-foreground sm:pt-44 sm:pb-20",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-7xl">
        <h1 className="max-w-[18ch] text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] text-balance sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {deck && (
          <p className="mt-6 max-w-2xl text-xl leading-snug text-balance sm:text-2xl">
            {deck}
          </p>
        )}
        {description && (
          <p className="mt-5 max-w-2xl leading-relaxed text-pretty text-primary-foreground/80">
            {description}
          </p>
        )}
        {children}
      </div>
    </section>
  );
};

export default PageHeader;
