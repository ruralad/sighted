"use client";

// Thin persistence layer over IndexedDB using idb-keyval's default store.
// All keys are prefixed with "sighted75:" to namespace within the shared DB.
import { get, set, del } from "idb-keyval";
import type { Language, StoredSolution } from "../types/question";

const COMPLETED_KEY = "sighted75:completed";
const CURRENT_KEY = "sighted75:currentQuestion";

function solutionKey(questionId: number): string {
  return `sighted75:solution:${questionId}`;
}

export async function getCompleted(): Promise<Set<number>> {
  const raw = await get<number[]>(COMPLETED_KEY);
  return new Set(raw ?? []);
}

// Reads the full set, mutates, and writes back — acceptable for small sets (<100 items).
// IndexedDB can't store Sets directly, so we serialize as number[].
export async function markCompleted(questionId: number): Promise<Set<number>> {
  const completed = await getCompleted();
  completed.add(questionId);
  await set(COMPLETED_KEY, [...completed]);
  return completed;
}

export async function unmarkCompleted(
  questionId: number,
): Promise<Set<number>> {
  const completed = await getCompleted();
  completed.delete(questionId);
  await set(COMPLETED_KEY, [...completed]);
  return completed;
}

export async function resetProgress(): Promise<void> {
  await del(COMPLETED_KEY);
  await del(CURRENT_KEY);
}

export async function getCurrentQuestion(): Promise<number | null> {
  const val = await get<number>(CURRENT_KEY);
  return val ?? null;
}

export async function setCurrentQuestion(
  questionId: number | null,
): Promise<void> {
  if (questionId === null) {
    await del(CURRENT_KEY);
  } else {
    await set(CURRENT_KEY, questionId);
  }
}

export async function saveSolution(
  questionId: number,
  language: Language,
  code: string,
): Promise<void> {
  const solution: StoredSolution = {
    language,
    code,
    timestamp: Date.now(),
  };
  await set(solutionKey(questionId), solution);
}
