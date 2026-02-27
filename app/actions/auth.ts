"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSession, deleteSession } from "@/lib/auth/session";

function generateId(): string {
  return crypto.randomUUID();
}

const USERNAME_RE = /^[a-zA-Z0-9_.-]+$/;

export async function signUp(
  username: string,
  password: string,
  displayName: string,
): Promise<{ error?: string }> {
  const trimmed = username.trim().toLowerCase();

  if (trimmed.length < 3 || trimmed.length > 30) {
    return { error: "Username must be 3\u201330 characters." };
  }
  if (!USERNAME_RE.test(trimmed)) {
    return { error: "Username can only contain letters, numbers, underscores, dots, and hyphens." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, trimmed))
    .limit(1);

  if (existing.length > 0) {
    return { error: "Username is already taken." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = generateId();
  const name = displayName.trim() || trimmed;

  await db.insert(users).values({
    id,
    username: trimmed,
    passwordHash,
    displayName: name,
  });

  await createSession({ id, username: trimmed, displayName: name });
  return {};
}

export async function signIn(
  username: string,
  password: string,
): Promise<{ error?: string }> {
  const trimmed = username.trim().toLowerCase();

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, trimmed))
    .limit(1);

  if (rows.length === 0) {
    return { error: "Invalid username or password." };
  }

  const user = rows[0]!;
  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    return { error: "Invalid username or password." };
  }

  await createSession({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
  });
  return {};
}

export async function signOut(): Promise<void> {
  await deleteSession();
}
