import {
  Church,
  Mountain,
  UtensilsCrossed,
  Waves,
  type LucideIcon,
} from "lucide-react";

/**
 * Every photograph on this page is openly licensed and downloaded from
 * Wikimedia Commons. `author`, `license` and `source` are not decoration: CC BY
 * and CC BY-SA both require attribution, and the page renders it. If a photo is
 * ever swapped, its credit has to be swapped with it.
 */
export type Credit = {
  author: string;
  license: string;
  licenseUrl: string;
  source: string;
};

export type CityHighlight = {
  key: string;
  icon: LucideIcon;
  image: string;
  credit: Credit;
};

export const heroImage = {
  src: "/lleida/ciutat.webp",
  credit: {
    author: "ESM",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Lleida_-_rambla_Ferran_i_Tur%C3%B3_de_la_Seu_Vella.jpg",
  },
} satisfies { src: string; credit: Credit };

/** What there is to do in Lleida, in the order the page argues it. */
export const cityHighlights: CityHighlight[] = [
  {
    key: "old-town",
    icon: Church,
    image: "/lleida/seu-vella.webp",
    credit: {
      author: "Manuel Portero",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Seu_Vella_de_Lleida_(catedral_vieja).jpg",
    },
  },
  {
    key: "river",
    icon: Waves,
    image: "/lleida/segre.webp",
    credit: {
      author: "Amics de la Foto de Lleida",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
      source: "https://commons.wikimedia.org/wiki/File:La_Mitjana-a.jpg",
    },
  },
  {
    key: "mountains",
    icon: Mountain,
    image: "/lleida/pirineu.webp",
    credit: {
      author: "jokin.lacalle",
      license: "CC BY 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Estany_de_Sant_Maurici_-_Flickr_-_jokin.lacalle.jpg",
    },
  },
  {
    key: "food",
    icon: UtensilsCrossed,
    image: "/lleida/cargols.webp",
    credit: {
      author: "Chixoy",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
      source: "https://commons.wikimedia.org/wiki/File:Cargols_a_la_llauna.JPG",
    },
  },
];
