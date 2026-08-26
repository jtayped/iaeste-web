"use client";
import { Button } from "@repo/ui/button";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";
import ButtonGroup from "@repo/ui/button-group";
import { Link } from "@/i18n/routing";
import { Building } from "lucide-react";
import { Paragraph } from "@repo/ui/typography";

const Hero = () => {
  const t = useTranslations("HomePage.hero");

  return (
    <div className="relative">
      <Image
        src={"/hero.jpg"}
        width={768}
        height={1200}
        alt="Hero background"
        className="fixed -z-10 h-full w-full object-cover"
        priority
      />
      <div className="section-padding flex h-screen items-center justify-center bg-primary/60 text-white">
        <div className="flex max-w-3xl flex-col items-center text-center">
          <div className="flex items-center gap-1">
            <h1 className="text-6xl font-extrabold lg:text-8xl">IAESTE</h1>
            <div className="flex flex-col items-start">
              <div className="flex items-end">
                <motion.span
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="text-3xl font-bold leading-none"
                >
                  LC
                </motion.span>
                <motion.div
                  initial={{ rotate: -120, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                >
                  <Image
                    src={"/logos/icon-lleida-white.png"}
                    height={64}
                    width={64}
                    alt="IAESTE Lleida's logo"
                    className="size-8 lg:size-12"
                  />
                </motion.div>
              </div>
              <motion.span
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-xl font-extrabold leading-none lg:text-3xl"
              >
                LLEIDA
              </motion.span>
            </div>
          </div>
          <Paragraph>{t("description")}</Paragraph>
          <ButtonGroup className="mt-4">
            <Button variant={"default"} size={"lg"} asChild>
              <Link href="/company">
                <Building />
                {t("buttons.company")}
              </Link>
            </Button>
            <Button variant={"secondary"} size={"lg"} asChild>
              <Link href="/student">{t("buttons.student")}</Link>
            </Button>
          </ButtonGroup>
        </div>
      </div>
    </div>
  );
};

export default Hero;
