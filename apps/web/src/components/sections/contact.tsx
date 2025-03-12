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
    <DivideSection>
      <div>
        <div className="flex items-center gap-3.5">
          <H2>{t("title")}</H2>
          <ul className="flex items-center gap-2">
            {socials.map((s) => {
              const Icon = s.icon;
              return (
                <li key={s.name}>
                  <Link href={s.href}>
                    <Icon size={25} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <Paragraph>{t("description")}</Paragraph>
        <SendEmailBtn icon />
      </div>
      <ContactForm />
    </DivideSection>
  );
};

export default Contact;
