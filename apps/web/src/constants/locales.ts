interface Locale {
  label: string;
  svg: string;
}

type Locales = Record<string, Locale>;

export const locales: Locales = {
  en: { label: "English", svg: "/icons/gb.svg" },
  ca: { label: "Català", svg: "/icons/ca.svg" },
  es: { label: "Español", svg: "/icons/es.svg" },
};
