import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  verified: integer("verified", { mode: "number" }).notNull().default(0),
  verificationToken: text("verificationToken"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const credentials = sqliteTable("credentials", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id),
  credentialId: text("credentialId").notNull().unique(),
  publicKey: text("publicKey").notNull(),
  counter: integer("counter").notNull().default(0),
  transports: text("transports"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});
