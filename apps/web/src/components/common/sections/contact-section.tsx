import SendEmailBtn from "@/components/common/buttons/send-email";
import ContactForm from "@/components/common/contact-form";
import DivideSection from "@/components/common/sections/divide";
import { H2, Paragraph } from "@repo/ui/typography";
import { useTranslations } from "next-intl";
import React from "react";

/**
 * The "write to us" half of a page, beside the form itself.
 *
 * `sections/contact.tsx`, `sections/students/contact.tsx` and
 * `sections/companies/contact.tsx` were the same twenty lines three times over,
 * differing only in namespace — which is how the home one acquired a set of
 * social links and a `md:items-center` the other two never got.
 */
const ContactSection = ({
  namespace,
  children,
}: {
  namespace: string;
  /** Extra content under the CTA — the home page's social links. */
  children?: React.ReactNode;
}) => {
  const t = useTranslations(namespace);

  return (
    <DivideSection innerClassName="md:items-center">
      <article>
        <H2>{t("title")}</H2>
        <Paragraph className="mt-4 max-w-[52ch] leading-relaxed text-muted-foreground">
          {t("description")}
        </Paragraph>
        <div className="mt-8">
          <SendEmailBtn />
        </div>
        {children}
      </article>
      <ContactForm />
    </DivideSection>
  );
};

export default ContactSection;
