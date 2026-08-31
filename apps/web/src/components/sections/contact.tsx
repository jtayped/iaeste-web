import { useTranslations } from "next-intl";
import ContactForm from "../common/contact-form";
import socials from "@/constants/socials";
import Link from "next/link";
import SendEmailBtn from "../common/buttons/send-email";
import { H2, Paragraph } from "@repo/ui/typography";
import DivideSection from "../common/sections/divide";

const Contact = () => {
  const t = useTranslations("contact");

  return (
    <DivideSection className="md:items-center">
      <article>
        <H2>{t("title")}</H2>
        <Paragraph className="max-w-[46ch] leading-relaxed text-muted-foreground">
          {t("description")}
        </Paragraph>
        <SendEmailBtn icon />

        {/* These were bare 25px glyphs sharing a flex row with the heading:
            too small to tap, and optically adrift against 30px type. */}
        <ul className="mt-10 flex flex-wrap items-center gap-2">
          {socials.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.name}>
                <Link
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  className="flex size-11 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Icon size={18} aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </article>
      <ContactForm />
    </DivideSection>
  );
};

export default Contact;
