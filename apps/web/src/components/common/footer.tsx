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
      className="flex items-center gap-3 hover:underline underline-offset-2"
    >
      {children}
      <ArrowUpRight size={20} />
    </Link>
  );
};

const Footer = () => {
  return (
    <div className="bg-primary text-primary-foreground py-8">
      <DivideSection>
        <div className="space-y-4 max-w-sm">
          <Image
            src={"/logos/horizontal.png"}
            width={300}
            height={200}
            alt="IAESTE Logo"
            className="h-auto w-48"
          />
          <div className="space-y-2">
            <p className="font-semibold">{legalName}</p>
            <p className="text-sm">{address}</p>
            <p className="text-sm">Tel: {phone}</p>
            <p className="text-sm">Email: {email}</p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="space-y-4">
            <h4 className="font-bold text-lg">Quick Links</h4>
            <nav className="flex flex-col space-y-3">
              <LinkBtn href="/company">For companies</LinkBtn>
              <LinkBtn href="/student">For students</LinkBtn>
              <LinkBtn href="/incomming">For incomming students</LinkBtn>
            </nav>
          </div>
        </div>
      </DivideSection>
      <Section>
        <div className="border-t border-white/20 mt-8 pt-4 text-center text-sm">
          <p>
            © {new Date().getFullYear()} {legalName}. All rights reserved.
          </p>
        </div>
      </Section>
    </div>
  );
};

export default Footer;
