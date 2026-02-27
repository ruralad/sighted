import {
  pgTable,
  pgSchema,
  serial,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const neonAuthSchema = pgSchema("neon_auth");

const neonAuthUsers = neonAuthSchema.table("user", {
  id: uuid("id").primaryKey(),
});

export const userProgress = pgTable(
  "user_progress",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => neonAuthUsers.id, { onDelete: "cascade" }),
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
  userId: uuid("user_id")
    .primaryKey()
    .references(() => neonAuthUsers.id, { onDelete: "cascade" }),
  theme: jsonb("theme"),
  editor: jsonb("editor"),
});
