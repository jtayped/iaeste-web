interface Locale {
  label: string;
  svg: string;
}

type Locales = Record<string, Locale>;

export const locales: Locales = {
  en: { label: "english", svg: "/icons/gb.svg" },
  ca: { label: "català", svg: "/icons/ca.svg" },
  es: { label: "español", svg: "/icons/es.svg" },
};
