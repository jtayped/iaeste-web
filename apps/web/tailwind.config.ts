// tailwind config is required for editor support

import type { Config } from "tailwindcss";
import sharedConfig from "@repo/ui/tailwind.config";

const config: Pick<Config, "presets" | "theme"> = {
  presets: [sharedConfig],
  theme: {
    extend: {
      padding: {
        "screen-lg": "4rem",
        "screen-md": "2.25rem",
        "screen-sm": "1.5rem",
      },
    },
  },
};

export default config;
