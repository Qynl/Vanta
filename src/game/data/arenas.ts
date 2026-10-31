export type ArenaGlyphKind = "vertex" | "reactor" | "breach" | "sector";

export interface ArenaSummary {
  id: string;
  index: string;
  name: string;
  environment: string;
  tagline: string;
  size: string;
  vertical: string;
  accent: string;
  glyph: ArenaGlyphKind;
  zones: readonly string[];
  status: "IN DEVELOPMENT";
}

export const ARENAS = [
  {
    id: "vertex",
    index: "01",
    name: "VERTEX",
    environment: "RAIN-SLICK MEGACITY",
    tagline: "Rooftops, neon and a long way down.",
    size: "500 × 500 M",
    vertical: "−40 / +160 M",
    accent: "#79e6d2",
    glyph: "vertex",
    zones: ["THE NEEDLE", "TRANSIT UNDERCITY", "SKYBRIDGE LOOP"],
    status: "IN DEVELOPMENT",
  },
  {
    id: "reactor",
    index: "02",
    name: "REACTOR",
    environment: "INDUSTRIAL COMPLEX",
    tagline: "Heat, rust and sightlines that bite.",
    size: "500 × 500 M",
    vertical: "−80 / +100 M",
    accent: "#ff9a52",
    glyph: "reactor",
    zones: ["CORE RING", "FOUNDRY", "COOLING TOWERS"],
    status: "IN DEVELOPMENT",
  },
  {
    id: "breach",
    index: "03",
    name: "BREACH",
    environment: "FLOATING FACILITY",
    tagline: "No floor. No margin. No second step.",
    size: "500 × 500 M",
    vertical: "+20 / +140 M",
    accent: "#a8c8ff",
    glyph: "breach",
    zones: ["BROKEN RING", "HANGAR ISLAND", "OBSERVATION DECK"],
    status: "IN DEVELOPMENT",
  },
  {
    id: "sector-09",
    index: "04",
    name: "SECTOR 09",
    environment: "RESEARCH CAMPUS",
    tagline: "A city-sized lab with nowhere to hide.",
    size: "700 × 700 M",
    vertical: "−60 / +90 M",
    accent: "#d8ff45",
    glyph: "sector",
    zones: ["CENTRAL COURTYARD", "SUBLEVEL WARRENS", "SOLAR FIELD"],
    status: "IN DEVELOPMENT",
  },
] as const satisfies readonly ArenaSummary[];
