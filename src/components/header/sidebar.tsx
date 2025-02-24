import React from "react";
import { Button } from "../ui/button";
import { Menu, X } from "lucide-react";
import { useNavigation } from ".";
import { AnimatePresence } from "framer-motion";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import ChangeTranslation from "../common/change-translation";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.075, // Delay between each child animation
      delayChildren: 0.1, // Initial delay before children start animating
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
};

const SidebarComponent = () => {
  const t = useTranslations("header.pages");
  const { toggleSidebar } = useNavigation();

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: 0.15 }}
      className="fixed left-0 top-0 w-full h-full"
    >
      <div className="w-full h-full flex items-center justify-center relative bg-primary text-primary-foreground">
        <button
          onClick={toggleSidebar}
          className="absolute top-8 right-8 outline-none"
        >
          <X size={30} />
        </button>
        <motion.nav
          className="grid gap-6 text-3xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Item href="/">{t("home.name").toUpperCase()}</Item>
          <Item href="/student">{t("student.name").toUpperCase()}</Item>
          <Item href="/incomming">{t("incomming.name").toUpperCase()}</Item>
          <Item href="/company">{t("company.name").toUpperCase()}</Item>
        </motion.nav>
      </div>
      <div className="absolute bottom-0 w-full p-screen">
        <ChangeTranslation className="w-full"/>
      </div>
    </motion.div>
  );
};

const Item = ({
  children,
  href,
  className = "",
}: {
  children: string;
  href: string;
  className?: string;
}) => {
  const { toggleSidebar } = useNavigation();

  return (
    <motion.div variants={itemVariants} className={cn("relative", className)}>
      <Link href={href} onClick={toggleSidebar}>
        {children}
      </Link>
      <motion.div
        className="h-2 bg-primary-foreground"
        initial={{ width: 0 }}
        animate={{ width: 30 }}
        transition={{ delay: 0.35 }}
      />
    </motion.div>
  );
};

const Sidebar = ({ className = "" }: { className?: string }) => {
  const { toggleSidebar, isSidebarOpen } = useNavigation();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className={cn("", className)}
      >
        <Menu size={30} />
      </Button>
      <AnimatePresence>{isSidebarOpen && <SidebarComponent />}</AnimatePresence>
    </>
  );
};

export default Sidebar;
