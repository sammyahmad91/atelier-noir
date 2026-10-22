import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const fragrances = sqliteTable(
  "fragrances",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    house: text("house").notNull(),
    concentration: text("concentration").notNull(),
    family: text("family").notNull(),
    year: integer("year"),
    topNotes: text("top_notes", { mode: "json" }).$type<string[]>().notNull(),
    heartNotes: text("heart_notes", { mode: "json" }).$type<string[]>().notNull(),
    baseNotes: text("base_notes", { mode: "json" }).$type<string[]>().notNull(),
    seasons: text("seasons", { mode: "json" }).$type<string[]>().notNull(),
    timeOfDay: text("time_of_day").notNull(),
    intensity: integer("intensity").notNull(),
    sizeMl: integer("size_ml").notNull(),
    remainingPct: integer("remaining_pct").notNull(),
    story: text("story").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("fragrances_user_idx").on(t.userId)],
);

export const wears = sqliteTable(
  "wears",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fragranceId: text("fragrance_id")
      .notNull()
      .references(() => fragrances.id, { onDelete: "cascade" }),
    wornAt: integer("worn_at", { mode: "timestamp_ms" }).notNull(),
    occasion: text("occasion").notNull(),
    weather: text("weather").notNull(),
    compliments: integer("compliments").notNull().default(0),
    rating: integer("rating").notNull(),
    note: text("note").notNull().default(""),
  },
  (t) => [
    index("wears_user_idx").on(t.userId),
    index("wears_fragrance_idx").on(t.fragranceId),
  ],
);

export type User = typeof users.$inferSelect;
export type Fragrance = typeof fragrances.$inferSelect;
export type NewFragrance = typeof fragrances.$inferInsert;
export type Wear = typeof wears.$inferSelect;
