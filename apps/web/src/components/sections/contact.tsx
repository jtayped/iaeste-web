import ContactSection from "@/components/common/sections/contact-section";
import socials from "@/constants/socials";
import Link from "next/link";
import React from "react";

const Contact = () => (
  <ContactSection namespace="contact">
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
              className="flex size-11 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Icon size={18} aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  </ContactSection>
);

export default Contact;
