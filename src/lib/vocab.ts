export const FAMILIES = [
  "Citrus",
  "Aromatic",
  "Floral",
  "Chypre",
  "Woody",
  "Amber",
  "Gourmand",
  "Leather",
  "Aquatic",
  "Green",
] as const;
export type Family = (typeof FAMILIES)[number];

export const CONCENTRATIONS = ["Cologne", "EDT", "EDP", "Parfum", "Extrait"] as const;
export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];
export const TIMES = ["day", "night", "both"] as const;
export const OCCASIONS = ["everyday", "office", "evening", "date", "ceremony"] as const;
export type Occasion = (typeof OCCASIONS)[number];
export const WEATHERS = ["hot", "mild", "cold", "rain"] as const;
export type Weather = (typeof WEATHERS)[number];

export const OCCASION_LABEL: Record<Occasion, string> = {
  everyday: "Everyday",
  office: "Office",
  evening: "Evening out",
  date: "Date night",
  ceremony: "Ceremony",
};

export const WEATHER_LABEL: Record<Weather, string> = {
  hot: "Hot",
  mild: "Mild",
  cold: "Cold",
  rain: "Rain",
};

/** Liquid tint per olfactive family, as [highlight, body, depth]. */
export const FAMILY_TINT: Record<Family, [string, string, string]> = {
  Citrus: ["#F6E7A8", "#E2B94F", "#9C7421"],
  Aromatic: ["#D9E2C4", "#9DAF7F", "#5C6B45"],
  Floral: ["#F3D6D2", "#D89A97", "#8E5150"],
  Chypre: ["#D8D0B0", "#A39867", "#5F5733"],
  Woody: ["#E2C39E", "#A87A4E", "#5A3A1E"],
  Amber: ["#F2C98A", "#C77B2E", "#6E3610"],
  Gourmand: ["#EBCDA9", "#B3804F", "#5E3B1F"],
  Leather: ["#C9A890", "#7D5640", "#3A2418"],
  Aquatic: ["#CFE3E6", "#86AEB6", "#40636B"],
  Green: ["#D3E5C2", "#86A866", "#3F5A2B"],
};

export function isFamily(v: string): v is Family {
  return (FAMILIES as readonly string[]).includes(v);
}

export function tintFor(family: string): [string, string, string] {
  return isFamily(family) ? FAMILY_TINT[family] : FAMILY_TINT.Woody;
}
