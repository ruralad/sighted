import "server-only";
import { getSession, type SessionPayload } from "./session";

export async function verifySession(): Promise<SessionPayload | null> {
  return getSession();
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}
