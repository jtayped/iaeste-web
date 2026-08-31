import React from "react";
import { createPortal } from "react-dom";
import { Button, buttonVariants } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { ChevronRight, Menu, X } from "lucide-react";
import { useNavigation } from "..";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Logo } from "@repo/ui/logo";
import ChangeTranslation from "./change-translation";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0 },
};

const SidebarComponent = () => {
  const t = useTranslations("header");
  const { toggleSidebar } = useNavigation();

  // A full-screen panel that leaves the page scrolling behind it feels broken,
  // and a sheet with no way out but the X is worse.
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleSidebar();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [toggleSidebar]);

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label="menu"
      className="fixed inset-0 z-50 flex flex-col bg-primary text-primary-foreground"
    >
      {/* Mirrors the header it replaces, so the logo holds still and the close
          control lands exactly where the menu button was. */}
      <div className="section-padding flex shrink-0 items-center justify-between border-b border-white/10 py-3">
        <Link href="/" onClick={toggleSidebar} aria-label="iaeste lc lleida">
          <Logo variant="horizontal" color="white" width={132} alt="" />
        </Link>
        <button
          onClick={toggleSidebar}
          aria-label="close menu"
          className="-mr-2 grid size-11 place-items-center rounded-lg transition-colors outline-none hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-white/40"
        >
          <X size={24} />
        </button>
      </div>

      <motion.nav
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="section-padding flex-1 overflow-y-auto py-2"
      >
        <Item href="/">{t("pages.home.name")}</Item>
        <Item href="/student">{t("pages.student.name")}</Item>
        <Item href="/incommings">{t("pages.incomming.name")}</Item>
        <Item href="/company">{t("pages.company.name")}</Item>
        <Item href="/blog">{t("pages.blog.name")}</Item>
      </motion.nav>

      <div className="section-padding shrink-0 space-y-3 border-t border-white/10 pt-5 pb-8">
        <ChangeTranslation />
        <Link
          href="#contact-form"
          onClick={toggleSidebar}
          className={buttonVariants({
            className:
              "h-12 w-full bg-white text-base text-primary hover:bg-white/90",
          })}
        >
          {t("contact-btn")}
        </Link>
      </div>
    </motion.div>
  );
};

const Item = ({ children, href }: { children: string; href: string }) => {
  const { toggleSidebar } = useNavigation();

  return (
    <motion.div
      variants={itemVariants}
      className="border-b border-white/10 last:border-b-0"
    >
      <Link
        href={href}
        onClick={toggleSidebar}
        className="flex items-center justify-between gap-4 py-4 text-2xl transition-colors hover:text-white/70"
      >
        {children}
        <ChevronRight
          size={20}
          aria-hidden
          className="shrink-0 text-primary-foreground/40"
        />
      </Link>
    </motion.div>
  );
};

const Sidebar = ({ className = "" }: { className?: string }) => {
  const { toggleSidebar, isSidebarOpen } = useNavigation();

  // `document` does not exist while this renders on the server.
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => setIsMounted(true), []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        aria-label="open menu"
        aria-expanded={isSidebarOpen}
        className={cn(
          "hover:bg-white/10 hover:text-primary-foreground [&_svg]:size-6",
          className,
        )}
      >
        <Menu />
      </Button>
      {/* Rendered on `body`, not inside `<header>`: the header's
          `backdrop-blur` makes it a containing block for fixed descendants,
          which would pin this panel to the header's own 65px box. */}
      {isMounted &&
        createPortal(
          <AnimatePresence>
            {isSidebarOpen && <SidebarComponent />}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};

export default Sidebar;
