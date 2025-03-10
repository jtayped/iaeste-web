import type { Config } from "tailwindcss";
import sharedConfig from "@repo/ui/tailwind.config";

export default {
  content: ["./src/**/*.tsx"],
  presets: [sharedConfig],
} satisfies Config;
