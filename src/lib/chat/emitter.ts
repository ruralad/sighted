/**
 * In-memory event emitter for SSE message broadcasting.
 * Each listener is keyed by userId so we push only to members of a room.
 */

export interface ChatEvent {
  type: "message" | "room_created" | "member_joined" | "key_uploaded";
  roomId: string;
  payload: unknown;
}

type Listener = (event: ChatEvent) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribe(userId: string, listener: Listener): () => void {
  let set = listeners.get(userId);
  if (!set) {
    set = new Set();
    listeners.set(userId, set);
  }
  set.add(listener);

  return () => {
    set!.delete(listener);
    if (set!.size === 0) listeners.delete(userId);
  };
}

export function emit(userIds: string[], event: ChatEvent): void {
  for (const uid of userIds) {
    const set = listeners.get(uid);
    if (set) {
      for (const fn of set) fn(event);
    }
  }
}
