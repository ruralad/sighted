import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userProgress = pgTable(
  "user_progress",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: integer("question_id").notNull(),
    completed: boolean("completed").default(false).notNull(),
    completedAt: timestamp("completed_at"),
    attempts: integer("attempts").default(0).notNull(),
    revisits: integer("revisits").default(0).notNull(),
    lastVisitedAt: timestamp("last_visited_at"),
    bestSolution: text("best_solution"),
    language: text("language"),
    timeSpentSecs: integer("time_spent_secs").default(0).notNull(),
  },
  (t) => [uniqueIndex("user_question_idx").on(t.userId, t.questionId)],
);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: jsonb("theme"),
  editor: jsonb("editor"),
});
