import { get, set, del } from "idb-keyval";
import type { Language, StoredSolution } from "../types/question";

const COMPLETED_KEY = "blind75:completed";
const CURRENT_KEY = "blind75:currentQuestion";

function solutionKey(questionId: number): string {
  return `blind75:solution:${questionId}`;
}

export async function getCompleted(): Promise<Set<number>> {
  const raw = await get<number[]>(COMPLETED_KEY);
  return new Set(raw ?? []);
}

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

export async function getSolution(
  questionId: number,
): Promise<StoredSolution | null> {
  const val = await get<StoredSolution>(solutionKey(questionId));
  return val ?? null;
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
