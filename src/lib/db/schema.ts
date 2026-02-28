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

// ── Group tables ─────────────────────────────────────────────

export const groups = pgTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  chatRoomId: text("chat_room_id").references(() => chatRooms.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // "admin" | "member"
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] })],
);

export const groupInvitations = pgTable(
  "group_invitations",
  {
    id: serial("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inviteeId: text("invitee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // "pending" | "accepted" | "declined"
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("group_invitee_pending_idx").on(t.groupId, t.inviteeId),
  ],
);

export const groupSessions = pgTable("group_sessions", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull(),
  durationSecs: integer("duration_secs").notNull(),
  startedBy: text("started_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  status: text("status").notNull().default("active"), // "active" | "completed"
});

export const groupSessionResults = pgTable(
  "group_session_results",
  {
    sessionId: text("session_id")
      .notNull()
      .references(() => groupSessions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    completed: boolean("completed").notNull().default(false),
    timeSpentSecs: integer("time_spent_secs").notNull().default(0),
    submittedAt: timestamp("submitted_at"),
    code: text("code"),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.userId] })],
);
