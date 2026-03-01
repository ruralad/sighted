import "server-only";
import { getSession, type SessionPayload } from "./session";

export async function verifySession(): Promise<SessionPayload | null> {
  return getSession();
}

