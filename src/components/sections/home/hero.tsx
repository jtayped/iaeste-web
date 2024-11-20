"use client";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";

const Hero = () => {
  const t = useTranslations("HomePage.hero");

  return (
    <div className="relative">
      <Image
        src={"/hero.jpg"}
        width={768}
        height={1200}
        alt="Hero background"
        className="w-full h-full object-cover -z-10 fixed"
        priority
      />
      <div className="h-screen flex justify-center items-center bg-primary/60 text-white px-screen">
        <div className="flex flex-col items-center text-center max-w-3xl">
          <div className="flex items-center gap-1">
            <h1 className="text-6xl lg:text-8xl font-extrabold">IAESTE</h1>
            <div className="flex flex-col items-start">
              <div className="flex items-end">
                <motion.span
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="text-3xl leading-none"
                >
                  LC
                </motion.span>
                <motion.div
                  initial={{ rotate: -60, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                >
                  <Image
                    src={"/logos/icon-lleida-white.png"}
                    height={32}
                    width={32}
                    alt="IAESTE Lleida's logo"
                  />
                </motion.div>
              </div>
              <motion.span
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-xl font-extrabold leading-none"
              >
                LLEIDA
              </motion.span>
            </div>
          </div>

          <p className="text-md md:text-lg mt-4">{t("description")}</p>
          <div className="flex items-center gap-3 mt-3">
            <Button variant={"default"} size={"lg"}>
              {t("buttons.student")}
            </Button>
            <Button variant={"secondary"} size={"lg"}>
              {t("buttons.company")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
