import React from "react";
import DivideSection from "./sections/divide";
import { Logo } from "@repo/ui/logo";
import { legalName, email, address, phone } from "@/constants/contact";
import { Link } from "@/i18n/routing";
import Section from "./sections/section";
import { ArrowUpRight } from "lucide-react";

const LinkBtn = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 text-sm underline-offset-2 hover:underline"
    >
      {children}
      <ArrowUpRight size={18} />
    </Link>
  );
};

const Footer = () => {
  return (
    <footer className="bg-primary py-8 text-primary-foreground">
      <DivideSection>
        <div className="max-w-sm space-y-4">
          <Logo variant="horizontal" color="white" width={192} />
          <div>
            <p className="font-semibold">{legalName}</p>
            <div className="mt-3 space-y-2">
              <p className="mt-2 text-sm">{address}</p>
              <p className="text-sm">tel: {phone}</p>
              <p className="text-sm">email: {email}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-8 md:flex-row">
          <div>
            <h4 className="text-lg font-bold">quick links</h4>
            <nav className="mt-4 flex flex-col space-y-2">
              <LinkBtn href="/company">for companies</LinkBtn>
              <LinkBtn href="/student">for students</LinkBtn>
              <LinkBtn href="/incommings">for incomming students</LinkBtn>
            </nav>
          </div>
        </div>
      </DivideSection>
      <Section>
        <div className="mt-8 border-t border-white/20 pt-4 text-center text-sm">
          <p>
            © {new Date().getFullYear()} {legalName}. all rights reserved. |
            made by{" "}
            <Link
              href="https://www.linkedin.com/in/jtayped/"
              className="underline underline-offset-2"
            >
              joel taylor pedrós
            </Link>
          </p>
        </div>
      </Section>
    </footer>
  );
};

export default Footer;
