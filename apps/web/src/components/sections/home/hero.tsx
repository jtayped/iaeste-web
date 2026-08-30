"use client";
import { buttonVariants } from "@repo/ui/button";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";
import ButtonGroup from "@repo/ui/button-group";
import { Logo } from "@repo/ui/logo";
import { Link } from "@/i18n/routing";
import { Building } from "lucide-react";

const Hero = () => {
  const t = useTranslations("HomePage.hero");

  return (
    <div className="relative">
      <Image
        src={"/hero.jpg"}
        width={768}
        height={1200}
        alt="hero background"
        sizes="100vw"
        quality={85}
        className="fixed -z-10 h-full w-full object-cover"
        priority
      />
      {/* Same navy as the brand, graded so the type always has ground under it
          and the band hands off cleanly to the white section below. `pt-20`
          offsets the fixed header so the block sits on the optical centre. */}
      <div className="section-padding flex h-svh min-h-[34rem] items-center justify-center bg-gradient-to-b from-primary/75 via-primary/65 to-primary/80 pt-20 text-white">
        <div className="flex max-w-3xl flex-col items-center text-center">
          <div className="flex items-center gap-2 lg:gap-3">
            <h1 className="text-6xl font-extrabold leading-none tracking-[-0.035em] lg:text-8xl">
              iaeste
            </h1>
            {/* "lc ▣" over "lleida": both lines now scale with the wordmark, so
                the pair ends at roughly the same width at every breakpoint. */}
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-end gap-0.5">
                <motion.span
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="text-3xl font-bold leading-none tracking-tight lg:text-5xl"
                >
                  lc
                </motion.span>
                <motion.div
                  initial={{ rotate: -120, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                >
                  {/* Decorative: the wordmark it sits inside already reads
                      "iaeste lc lleida" in live type. */}
                  <Logo
                    variant="icon"
                    color="white"
                    width={48}
                    alt=""
                    priority
                    className="size-8 lg:size-12"
                  />
                </motion.div>
              </div>
              <motion.span
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-xl font-extrabold leading-none tracking-tight lg:text-3xl"
              >
                lleida
              </motion.span>
            </div>
          </div>

          {/* The copy and the buttons used to appear fully formed while the
              wordmark animated in; they now follow it on the same beat. */}
          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-white/90"
          >
            {t("description")}
          </motion.p>

          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <ButtonGroup className="mt-9">
              {/* `default` is the same navy as the overlay, so the primary
                  action gets a white plate instead. */}
              <Link
                href="/company"
                className={buttonVariants({
                  className:
                    "h-11 bg-white px-6 text-base text-primary shadow-sm hover:bg-white/90 md:h-12 md:px-8",
                })}
              >
                <Building />
                {t("buttons.company")}
              </Link>
              <Link
                href="/student"
                className={buttonVariants({
                  variant: "secondary",
                  className: "h-11 px-6 text-base md:h-12 md:px-8",
                })}
              >
                {t("buttons.student")}
              </Link>
            </ButtonGroup>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
