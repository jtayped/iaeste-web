import React from "react";
import Image from "next/image";
import { Link, routing } from "@/i18n/routing"; // Ensure this import is correct
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { locales } from "@/constants/locales";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ChangeTranslation: React.FC<{
  className?: string;
  size?: "default" | "icon";
  align?: "center" | "end" | "start" | undefined;
}> = ({ align = "center", size = "default", className = "" }) => {
  const locale = useLocale();
  const pathname = usePathname();

  const { svg, label } = locales[locale];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn("justify-between bg-transparent", className)}
          variant={"ghost"}
        >
          <Image src={svg} alt={label} width={24} height={24} />
          {size !== "icon" ? label : null}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align={align}>
        {routing.locales.map((l) => {
          const { svg, label } = locales[l];
          return (
            <DropdownMenuItem key={l} asChild>
              <Link href={pathname} locale={l}>
                <div className="flex items-center gap-2">
                  <Image src={svg} alt={label} width={24} height={24} />
                  {label}
                </div>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ChangeTranslation;
