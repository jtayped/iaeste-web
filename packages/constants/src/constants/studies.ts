/**
 * Grouped by school section and campus so the inscripcions degree picker can
 * be searched/filtered instead of scrolled. Sourced from the EPS (Lleida) and
 * Igualada campus degree catalogue — see docs/content.md-adjacent note: this
 * list should be spot-checked against udl.cat/eps.udl.cat before it ships,
 * since the school's own site does not expose a single clean machine-readable
 * catalogue page.
 */
export interface DegreeSection {
  section: string;
  degrees: {
    label: (typeof DEGREE_OPTIONS)[number];
    campus: "Lleida" | "Igualada" | null;
  }[];
}

export const DEGREE_SECTIONS: DegreeSection[] = [
  {
    section: "informàtica i disseny",
    degrees: [
      { label: "grau en informàtica (lleida)", campus: "Lleida" },
      { label: "grau en informàtica (igualada)", campus: "Igualada" },
      { label: "grau en tècniques d'interacció digital", campus: "Igualada" },
      { label: "grau en disseny digital", campus: "Lleida" },
      { label: "doble grau en informàtica i ADE", campus: "Lleida" },
    ],
  },
  {
    section: "enginyeria industrial",
    degrees: [
      { label: "grau en enginyeria mecànica", campus: "Lleida" },
      { label: "grau en enginyeria química", campus: "Igualada" },
      { label: "grau en enginyeria de l'energia", campus: "Lleida" },
      { label: "grau en eng. electrònica industrial", campus: "Lleida" },
      { label: "grau en organització industrial", campus: "Igualada" },
      {
        label: "doble grau en organització industrial i ADE",
        campus: "Igualada",
      },
      { label: "doble grau en mecànica i energia", campus: "Lleida" },
    ],
  },
  {
    section: "arquitectura",
    degrees: [{ label: "grau en arquitectura tècnica", campus: "Lleida" }],
  },
  {
    section: "altres",
    degrees: [{ label: "altre", campus: null }],
  },
];

/** Flat list, in the same order as `DEGREE_SECTIONS`. Feeds the zod enum
 * used for validation; `degree` is stored as plain text (packages/db), so
 * reordering this list is safe, but renaming an entry orphans stored rows
 * that used the old label. */
export const DEGREE_OPTIONS = [
  "grau en informàtica (lleida)",
  "grau en informàtica (igualada)",
  "grau en tècniques d'interacció digital",
  "grau en disseny digital",
  "doble grau en informàtica i ADE",
  "grau en enginyeria mecànica",
  "grau en enginyeria química",
  "grau en enginyeria de l'energia",
  "grau en eng. electrònica industrial",
  "grau en organització industrial",
  "doble grau en organització industrial i ADE",
  "doble grau en mecànica i energia",
  "grau en arquitectura tècnica",
  "altre",
] as const;
