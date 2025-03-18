import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/email/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
};
export default config;
