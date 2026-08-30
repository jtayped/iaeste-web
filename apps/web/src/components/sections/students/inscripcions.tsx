import Section from "@/components/common/sections/section";
import Countdown from "@/components/sections/students/countdown";
import type { RegistrationWindow } from "@/lib/registration-status";
import { Button } from "@repo/ui/button";
import { H2 } from "@repo/ui/typography";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import React from "react";

const INSCRIPCIONS_URL = "https://inscripcions.iaestelleida.cat";

/**
 * The page's one conversion moment, so it gets the full-bleed navy band the
 * site reserves for the things it actually wants read.
 *
 * Three states, driven by the live campaign rather than a build flag: open
 * (copy + countdown to closing + the link), upcoming (teaser + countdown to
 * opening, deliberately with no link to a form that would turn them away),
 * and nothing at all.
 */
const Inscripcions = ({ status }: { status: RegistrationWindow | null }) => {
  const t = useTranslations("StudentsPage.registrations");

  const upcoming = status !== null && !status.open && status.opensAt !== null;
  if (status === null || (!status.open && !upcoming)) return null;

  const target = status.open ? status.closesAt : status.opensAt;

  return (
    <Section className="bg-primary py-14 text-primary-foreground md:py-16">
      {/* The countdown and the CTA share a column so the band stays balanced
          in both states: before registrations open there is no button, and a
          lone left-hand block would leave the right half empty. Two columns
          only from `lg` — below that the tiles and a 54ch paragraph do not
          fit side by side. */}
      <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-14">
        <div>
          <H2 className="mt-0 text-3xl md:text-4xl">
            {status.open ? t("title") : t("upcoming.title")}
          </H2>
          <p className="mt-4 max-w-[54ch] leading-relaxed text-primary-foreground/80">
            {status.open ? t("description") : t("upcoming.description")}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-5">
          {target && (
            <Countdown
              target={target}
              label={
                status.open ? t("countdown.closesIn") : t("countdown.opensIn")
              }
            />
          )}
          {status.open && (
            <Button
              asChild
              className="h-12 w-full bg-white px-7 text-base text-primary shadow-sm hover:bg-white/90"
            >
              <Link href={INSCRIPCIONS_URL}>
                {t("button")}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Section>
  );
};

export default Inscripcions;
