import { Card } from "@repo/ui/card";
import { cn } from "@repo/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import React from "react";

/**
 * A `FeatureCard` with a photograph on top.
 *
 * The icon stays: it sits on the photo as a small plate so the card still reads
 * as one of the site's cards rather than a picture with a caption under it, and
 * so the grid holds together when one image is darker than the rest.
 */
const PhotoCard = ({
  icon: Icon,
  image,
  title,
  description,
  alt,
  priority = false,
  className = "",
}: {
  icon: LucideIcon;
  image: string;
  title: string;
  description: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) => {
  return (
    <Card
      className={cn(
        "flex h-full flex-col p-0 transition-colors hover:border-primary/30",
        className,
      )}
    >
      <div className="relative aspect-[4/3] w-full">
        <Image
          src={image}
          alt={alt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        <span className="absolute bottom-3 left-3 grid size-10 place-items-center rounded-xl bg-background/90 text-primary backdrop-blur-sm">
          <Icon size={20} aria-hidden />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg leading-snug font-semibold tracking-tight text-balance">
          {title}
        </h3>
        <p className="mt-2 leading-relaxed text-pretty text-muted-foreground">
          {description}
        </p>
      </div>
    </Card>
  );
};

export default PhotoCard;
