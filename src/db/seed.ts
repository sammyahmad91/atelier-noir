import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

export const DEMO_EMAIL = "demo@ateliernoir.app";
export const DEMO_PASSWORD = "noir-demo-2026";

type Bottle = Omit<schema.NewFragrance, "id" | "userId" | "createdAt">;

const BOTTLES: Bottle[] = [
  {
    name: "Santal 33",
    house: "Le Labo",
    concentration: "EDP",
    family: "Woody",
    year: 2011,
    topNotes: ["Cardamom", "Violet"],
    heartNotes: ["Iris", "Papyrus"],
    baseNotes: ["Sandalwood", "Cedar", "Leather", "Amber"],
    seasons: ["spring", "autumn", "winter"],
    timeOfDay: "both",
    intensity: 4,
    sizeMl: 100,
    remainingPct: 62,
    story: "Bought in the Marais the week I moved to Paris. Smells like a leather notebook left in the sun.",
  },
  {
    name: "Baccarat Rouge 540",
    house: "Maison Francis Kurkdjian",
    concentration: "Extrait",
    family: "Amber",
    year: 2015,
    topNotes: ["Saffron", "Bitter Almond"],
    heartNotes: ["Jasmine", "Cedar"],
    baseNotes: ["Ambergris", "Fir Resin", "Musk"],
    seasons: ["autumn", "winter"],
    timeOfDay: "night",
    intensity: 5,
    sizeMl: 70,
    remainingPct: 78,
    story: "Burnt sugar and glass. Two sprays fill a room — reserved for nights that deserve it.",
  },
  {
    name: "Aventus",
    house: "Creed",
    concentration: "EDP",
    family: "Chypre",
    year: 2010,
    topNotes: ["Pineapple", "Bergamot", "Blackcurrant", "Apple"],
    heartNotes: ["Birch", "Patchouli", "Jasmine"],
    baseNotes: ["Musk", "Oakmoss", "Ambergris", "Vanilla"],
    seasons: ["spring", "summer", "autumn"],
    timeOfDay: "day",
    intensity: 4,
    sizeMl: 100,
    remainingPct: 40,
    story: "Batch 19M01. The smoky one. Worn to every interview that mattered.",
  },
  {
    name: "Neroli Portofino",
    house: "Tom Ford",
    concentration: "EDP",
    family: "Citrus",
    year: 2011,
    topNotes: ["Bergamot", "Mandarin", "Lemon", "Neroli"],
    heartNotes: ["Orange Blossom", "Lavender", "Rosemary"],
    baseNotes: ["Amber", "Angelica", "Musk"],
    seasons: ["spring", "summer"],
    timeOfDay: "day",
    intensity: 2,
    sizeMl: 50,
    remainingPct: 14,
    story: "Liquid Riviera. Almost gone — rationing the last of it for August.",
  },
  {
    name: "Tobacco Vanille",
    house: "Tom Ford",
    concentration: "EDP",
    family: "Gourmand",
    year: 2007,
    topNotes: ["Tobacco Leaf", "Spices"],
    heartNotes: ["Vanilla", "Cacao", "Tonka Bean", "Tobacco Blossom"],
    baseNotes: ["Dried Fruits", "Woody Notes"],
    seasons: ["autumn", "winter"],
    timeOfDay: "night",
    intensity: 5,
    sizeMl: 50,
    remainingPct: 85,
    story: "A gentleman's club in a bottle. December only.",
  },
  {
    name: "Portrait of a Lady",
    house: "Frédéric Malle",
    concentration: "EDP",
    family: "Floral",
    year: 2010,
    topNotes: ["Rose", "Raspberry", "Clove"],
    heartNotes: ["Patchouli", "Cinnamon"],
    baseNotes: ["Sandalwood", "Incense", "Musk", "Benzoin"],
    seasons: ["autumn", "winter"],
    timeOfDay: "night",
    intensity: 5,
    sizeMl: 50,
    remainingPct: 91,
    story: "Turkish rose drowned in incense. Too beautiful to wear casually, which is the problem.",
  },
  {
    name: "Terre d'Hermès",
    house: "Hermès",
    concentration: "EDT",
    family: "Woody",
    year: 2006,
    topNotes: ["Orange", "Grapefruit"],
    heartNotes: ["Pepper", "Pelargonium", "Flint"],
    baseNotes: ["Vetiver", "Cedar", "Patchouli", "Benzoin"],
    seasons: ["spring", "summer", "autumn"],
    timeOfDay: "day",
    intensity: 3,
    sizeMl: 100,
    remainingPct: 55,
    story: "Jean-Claude Ellena's earth and sky. My signature, if I'm forced to choose.",
  },
  {
    name: "Tuscan Leather",
    house: "Tom Ford",
    concentration: "EDP",
    family: "Leather",
    year: 2007,
    topNotes: ["Saffron", "Raspberry", "Thyme"],
    heartNotes: ["Olibanum", "Jasmine"],
    baseNotes: ["Leather", "Suede", "Amber", "Woody Notes"],
    seasons: ["autumn", "winter"],
    timeOfDay: "night",
    intensity: 5,
    sizeMl: 50,
    remainingPct: 70,
    story: "A blind buy that frightened me for a year. Now I understand it.",
  },
  {
    name: "Acqua di Giò Profondo",
    house: "Giorgio Armani",
    concentration: "EDP",
    family: "Aquatic",
    year: 2020,
    topNotes: ["Sea Notes", "Bergamot", "Green Mandarin"],
    heartNotes: ["Rosemary", "Lavender", "Cypress", "Mastic"],
    baseNotes: ["Mineral Notes", "Musk", "Patchouli", "Amber"],
    seasons: ["spring", "summer"],
    timeOfDay: "day",
    intensity: 3,
    sizeMl: 75,
    remainingPct: 48,
    story: "The gym bag bottle. Unpretentious, always right in July.",
  },
];

// [bottle index, days ago, occasion, weather, compliments, rating, note]
const WEAR_HISTORY: [number, number, string, string, number, number, string][] = [
  [0, 1, "office", "mild", 1, 4, "Colleague asked if I'd been woodworking."],
  [6, 3, "everyday", "mild", 0, 5, ""],
  [2, 4, "office", "mild", 2, 5, "Pitch went well. Coincidence? No."],
  [1, 6, "date", "cold", 3, 5, "She leaned in. Twice."],
  [0, 8, "everyday", "rain", 0, 4, "Santal in the rain is unbeatable."],
  [8, 10, "everyday", "hot", 0, 3, ""],
  [3, 12, "everyday", "hot", 1, 4, "Last good spray of the summer."],
  [6, 14, "office", "mild", 1, 4, ""],
  [4, 17, "evening", "cold", 2, 5, "Jazz bar. Perfect pairing."],
  [2, 19, "ceremony", "mild", 4, 5, "Wedding — three people asked."],
  [0, 21, "office", "mild", 0, 4, ""],
  [1, 24, "evening", "cold", 2, 4, ""],
  [8, 27, "everyday", "hot", 0, 3, ""],
  [6, 30, "everyday", "mild", 0, 4, ""],
  [3, 33, "date", "hot", 2, 5, "Rooftop dinner."],
  [2, 36, "office", "mild", 1, 4, ""],
  [5, 47, "ceremony", "cold", 3, 5, "Opera night. Worth the wait."],
  [0, 50, "everyday", "mild", 0, 4, ""],
];

export async function seedDemo(db: LibSQLDatabase<typeof schema>) {
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, DEMO_EMAIL))
    .limit(1);
  if (existing.length) return;

  // Fixed IDs: on serverless hosts each instance may seed its own database, and session
  // cookies and bottle URLs must resolve identically on all of them.
  const userId = "demo-camille";
  const now = Date.now();
  const day = 86_400_000;

  await db.insert(schema.users).values({
    id: userId,
    name: "Camille",
    email: DEMO_EMAIL,
    passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
    createdAt: new Date(now - 90 * day),
  });

  const ids = BOTTLES.map((b) => `demo-${b.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}`);
  await db.insert(schema.fragrances).values(
    BOTTLES.map((b, i) => ({
      ...b,
      id: ids[i],
      userId,
      createdAt: new Date(now - (80 - i * 6) * day),
    })),
  );

  await db.insert(schema.wears).values(
    WEAR_HISTORY.map(([bottle, daysAgo, occasion, weather, compliments, rating, note], i) => ({
      id: `demo-wear-${i + 1}`,
      userId,
      fragranceId: ids[bottle],
      wornAt: new Date(now - daysAgo * day - 3 * 3_600_000),
      occasion,
      weather,
      compliments,
      rating,
      note,
    })),
  );
}
