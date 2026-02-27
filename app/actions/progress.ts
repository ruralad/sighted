"use server";

import { verifySession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { userProgress, userSettings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

async function getUserId(): Promise<string | null> {
  const session = await verifySession();
  return session?.userId ?? null;
}

export interface ProgressRow {
  questionId: number;
  completed: boolean;
  completedAt: string | null;
  attempts: number;
  revisits: number;
  lastVisitedAt: string | null;
  bestSolution: string | null;
  language: string | null;
  timeSpentSecs: number;
}

export async function getProgress(): Promise<ProgressRow[] | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const rows = await db
    .select()
    .from(userProgress)
    .where(eq(userProgress.userId, userId));

  return rows.map((r) => ({
    questionId: r.questionId,
    completed: r.completed,
    completedAt: r.completedAt?.toISOString() ?? null,
    attempts: r.attempts,
    revisits: r.revisits,
    lastVisitedAt: r.lastVisitedAt?.toISOString() ?? null,
    bestSolution: r.bestSolution,
    language: r.language,
    timeSpentSecs: r.timeSpentSecs,
  }));
}

export async function syncProgress(
  questionId: number,
  data: {
    completed?: boolean;
    completedAt?: string | null;
    bestSolution?: string | null;
    language?: string | null;
  },
): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  await db
    .insert(userProgress)
    .values({
      userId,
      questionId,
      completed: data.completed ?? false,
      completedAt: data.completedAt ? new Date(data.completedAt) : null,
      bestSolution: data.bestSolution ?? null,
      language: data.language ?? null,
    })
    .onConflictDoUpdate({
      target: [userProgress.userId, userProgress.questionId],
      set: {
        completed: data.completed ?? false,
        completedAt: data.completedAt ? new Date(data.completedAt) : null,
        bestSolution: data.bestSolution ?? undefined,
        language: data.language ?? undefined,
      },
    });
}

export async function recordAttempt(questionId: number): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  await db
    .insert(userProgress)
    .values({
      userId,
      questionId,
      attempts: 1,
      lastVisitedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userProgress.userId, userProgress.questionId],
      set: {
        attempts: sql`${userProgress.attempts} + 1`,
        lastVisitedAt: new Date(),
      },
    });
}

export async function recordRevisit(questionId: number): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  await db
    .insert(userProgress)
    .values({
      userId,
      questionId,
      revisits: 1,
      lastVisitedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userProgress.userId, userProgress.questionId],
      set: {
        revisits: sql`${userProgress.revisits} + 1`,
        lastVisitedAt: new Date(),
      },
    });
}

export async function saveSettings(
  theme: unknown,
  editor: unknown,
): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  await db
    .insert(userSettings)
    .values({ userId, theme, editor })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { theme, editor },
    });
}

export async function getSettings(): Promise<{
  theme: unknown;
  editor: unknown;
} | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const rows = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  if (rows.length === 0) return null;
  return { theme: rows[0]!.theme, editor: rows[0]!.editor };
}

export async function bulkSyncProgress(
  items: {
    questionId: number;
    completed: boolean;
    completedAt?: string | null;
    attempts?: number;
    revisits?: number;
  }[],
): Promise<void> {
  const userId = await getUserId();
  if (!userId || items.length === 0) return;

  for (const item of items) {
    await db
      .insert(userProgress)
      .values({
        userId,
        questionId: item.questionId,
        completed: item.completed,
        completedAt: item.completedAt ? new Date(item.completedAt) : null,
        attempts: item.attempts ?? 0,
        revisits: item.revisits ?? 0,
        lastVisitedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userProgress.userId, userProgress.questionId],
        set: {
          completed: sql`CASE WHEN ${userProgress.completed} THEN ${userProgress.completed} ELSE ${item.completed} END`,
          completedAt: sql`COALESCE(${userProgress.completedAt}, ${item.completedAt ? new Date(item.completedAt).toISOString() : null}::timestamp)`,
          attempts: sql`GREATEST(${userProgress.attempts}, ${item.attempts ?? 0})`,
          revisits: sql`GREATEST(${userProgress.revisits}, ${item.revisits ?? 0})`,
          lastVisitedAt: new Date(),
        },
      });
  }
}
