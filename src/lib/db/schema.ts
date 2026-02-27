import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  primaryKey,
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

// ── Chat tables ──────────────────────────────────────────────

export const userPublicKeys = pgTable("user_public_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  publicKey: text("public_key").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatRooms = pgTable("chat_rooms", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // "dm" | "group"
  name: text("name"),
  questionId: integer("question_id"),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const chatRoomMembers = pgTable(
  "chat_room_members",
  {
    roomId: text("room_id")
      .notNull()
      .references(() => chatRooms.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    encryptedRoomKey: text("encrypted_room_key"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.roomId, t.userId] })],
);

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => chatRooms.id, { onDelete: "cascade" }),
  senderId: text("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  senderPublicKeyId: text("sender_public_key_id"),
  contentType: text("content_type").notNull().default("rich"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
