import { cn } from "@repo/ui/lib/utils";
import { Loader as LoaderIcon } from "lucide-react";

const Loader = ({
  className = "",
  size = 25,
}: {
  className?: string;
  size?: number;
}) => {
  return <LoaderIcon className={cn("animate-spin", className)} size={size} />;
};

export default Loader;
