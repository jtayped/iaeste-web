import React from "react";
import DivideSection from "./sections/divide";
import Image from "next/image";
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
          <Image
            src={"/logos/horizontal.png"}
            width={300}
            height={200}
            alt="IAESTE Logo"
            className="h-auto w-48"
          />
          <div>
            <p className="font-semibold">{legalName}</p>
            <div className="mt-3 space-y-2">
              <p className="mt-2 text-sm">{address}</p>
              <p className="text-sm">Tel: {phone}</p>
              <p className="text-sm">Email: {email}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-8 md:flex-row">
          <div>
            <h4 className="text-lg font-bold">Quick Links</h4>
            <nav className="mt-4 flex flex-col space-y-2">
              <LinkBtn href="/company">For companies</LinkBtn>
              <LinkBtn href="/student">For students</LinkBtn>
              <LinkBtn href="/incomming">For incomming students</LinkBtn>
            </nav>
          </div>
        </div>
      </DivideSection>
      <Section>
        <div className="mt-8 border-t border-white/20 pt-4 text-center text-sm">
          <p>
            © {new Date().getFullYear()} {legalName}. All rights reserved. |
            Made by{" "}
            <Link
              href="https://www.linkedin.com/in/jtayped/"
              className="underline underline-offset-2"
            >
              Joel Taylor Pedrós
            </Link>
          </p>
        </div>
      </Section>
    </footer>
  );
};

export default Footer;
