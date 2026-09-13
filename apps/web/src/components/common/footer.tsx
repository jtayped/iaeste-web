import React from "react";
import { Logo } from "@repo/ui/logo";
import { legalName, email, address, phone } from "@/constants/contact";
import { Link } from "@/i18n/routing";
import Section from "./sections/section";
import socials from "@/constants/socials";
import { useTranslations } from "next-intl";

const PAGES = [
  { href: "/student", key: "student" },
  { href: "/company", key: "company" },
  { href: "/incommings", key: "incomming" },
  /* The blog is in the top-level nav and was missing from the footer. */
  { href: "/blog", key: "blog" },
] as const;

const Footer = () => {
  const t = useTranslations("footer");
  const tp = useTranslations("header.pages");

  return (
    <footer className="bg-primary text-primary-foreground">
      <Section className="pt-16 pb-10">
        <div className="grid gap-12 md:grid-cols-[1.2fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo variant="horizontal" color="white" width={192} alt="" />
            <p className="mt-5 leading-relaxed text-primary-foreground/80">
              {t("tagline")}
            </p>
          </div>

          <nav aria-label={t("links")}>
            <h2 className="text-sm font-semibold tracking-[0.08em] uppercase">
              {t("links")}
            </h2>
            {/* Were 20px-tall rows — the smallest tap targets on the site,
                on every page. `py-2.5` brings them to 44px. */}
            <ul className="mt-4 flex flex-col">
              {PAGES.map((page) => (
                <li key={page.key}>
                  <Link
                    href={page.href}
                    className="inline-flex py-2.5 text-primary-foreground/80 underline-offset-4 transition-colors hover:text-primary-foreground hover:underline focus-visible:ring-2 focus-visible:ring-primary-foreground/50 focus-visible:outline-none"
                  >
                    {tp(`${page.key}.name`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-sm font-semibold tracking-[0.08em] uppercase">
              {t("contactHeading")}
            </h2>
            <address className="mt-4 flex flex-col text-primary-foreground/80 not-italic">
              <span className="py-1">{address}</span>
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="inline-flex w-fit py-2.5 underline-offset-4 hover:text-primary-foreground hover:underline"
              >
                {phone}
              </a>
              <a
                href={`mailto:${email}`}
                className="inline-flex w-fit py-2.5 underline-offset-4 hover:text-primary-foreground hover:underline"
              >
                {email}
              </a>
            </address>

            <h2 className="mt-8 text-sm font-semibold tracking-[0.08em] uppercase">
              {t("followHeading")}
            </h2>
            {/* The social links only existed on the home page's contact
                section, so four of five pages had no route to them at all. */}
            <ul className="mt-4 flex flex-wrap gap-2">
              {socials.map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.name}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.name}
                      className="flex size-11 items-center justify-center rounded-lg border border-white/20 transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary-foreground/50 focus-visible:outline-none"
                    >
                      <Icon size={18} aria-hidden />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <p className="mt-14 border-t border-white/20 pt-6 text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} {legalName}. {t("rights")} {t("madeBy")}{" "}
          <a
            href="https://www.linkedin.com/in/jtayped/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex py-1 underline underline-offset-4 hover:text-primary-foreground"
          >
            joel taylor pedrós
          </a>
        </p>
      </Section>
    </footer>
  );
};

export default Footer;
