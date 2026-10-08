import { cn } from "@repo/ui/lib/utils";
import Image from "next/image";

import type { ExperienceDetail } from "@/lib/experiences";

export function ExperienceGallery({
  title,
  images,
  className,
}: {
  title: string;
  images: ExperienceDetail["gallery"];
  className?: string;
}) {
  if (images.length === 0) return null;
  const single = images.length === 1;

  return (
    <section aria-labelledby="experience-gallery" className={className}>
      <h2
        id="experience-gallery"
        className="text-2xl leading-tight font-bold tracking-[-0.025em]"
      >
        {title}
      </h2>
      <ul className={cn("mt-6 grid gap-4", !single && "sm:grid-cols-2")}>
        {images.map((image, index) => {
          const rendition = image.hero ?? image.original;
          return (
            <li
              key={`${index}:${rendition.url}`}
              className="relative aspect-[16/9] overflow-hidden rounded-xl bg-default"
            >
              <Image
                src={rendition.url}
                alt={image.alt}
                fill
                sizes={
                  single
                    ? "(min-width: 1024px) 1024px, 100vw"
                    : "(min-width: 1024px) 512px, (min-width: 640px) 50vw, 100vw"
                }
                className="object-cover"
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
