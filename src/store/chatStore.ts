"use client";

import { create } from "zustand";
import {
  getRooms,
  getMessages,
  sendMessage as sendMessageAction,
  createDmRoom,
  uploadPublicKey,
  searchUsers as searchUsersAction,
  type RoomInfo,
} from "../../app/actions/chat";
import { useChatCryptoStore } from "./chatCryptoStore";
import {
  encrypt,
  decrypt,
} from "@/lib/crypto/e2e";
import { useAuthStore } from "./authStore";

export interface DecryptedMessage {
  id: number;
  roomId: string;
  senderId: string;
  content: string;
  contentType: string;
  createdAt: string;
  pending?: boolean;
  failed?: boolean;
}

interface ChatStore {
  open: boolean;
  rooms: RoomInfo[];
  activeRoomId: string | null;
  messages: Map<string, DecryptedMessage[]>;
  loading: boolean;
  sseConnected: boolean;
  unreadCounts: Map<string, number>;
  error: string | null;

  setOpen: (open: boolean) => void;
  setActiveRoom: (roomId: string | null) => void;
  clearError: () => void;
  hydrate: () => Promise<void>;
  refreshRooms: () => Promise<void>;
  loadMessages: (roomId: string) => Promise<void>;
  sendMessage: (roomId: string, plaintext: string) => Promise<void>;
  startDm: (peerId: string) => Promise<string>;
  searchUsers: (query: string) => Promise<{ id: string; username: string; displayName: string }[]>;
  connectSse: () => void;
  disconnectSse: () => void;
}

let sseSource: EventSource | null = null;
let hydratePromise: Promise<void> | null = null;

export const useChatStore = create<ChatStore>((setState, getState) => ({
  open: false,
  rooms: [],
  activeRoomId: null,
  messages: new Map(),
  loading: false,
  sseConnected: false,
  unreadCounts: new Map(),
  error: null,

  setOpen: (open) => setState({ open }),
  clearError: () => setState({ error: null }),

  refreshRooms: async () => {
    try {
      const rooms = await getRooms();
      setState({ rooms });
    } catch {
      /* ignore */
    }
  },

  setActiveRoom: (roomId) => {
    setState((s) => {
      const unread = new Map(s.unreadCounts);
      if (roomId) unread.set(roomId, 0);
      return { activeRoomId: roomId, unreadCounts: unread };
    });
    if (roomId) {
      getState().loadMessages(roomId);
    }
  },

  hydrate: async () => {
    if (hydratePromise) return hydratePromise;

    hydratePromise = (async () => {
      setState({ loading: true });

      try {
        const cryptoStore = useChatCryptoStore.getState();
        await cryptoStore.hydrate();

        const freshCrypto = useChatCryptoStore.getState();
        if (freshCrypto.publicJwk && freshCrypto.keyId) {
          try {
            await uploadPublicKey(
              JSON.stringify(freshCrypto.publicJwk),
              freshCrypto.keyId,
            );
          } catch (e) {
            console.warn("[chat] uploadPublicKey failed:", e);
          }
        }

        const rooms = await getRooms();
        setState({ rooms, loading: false });
      } catch (e) {
        console.error("[chat] hydrate failed:", e);
        setState({ rooms: [], loading: false });
      }

      getState().connectSse();
      hydratePromise = null;
    })();

    return hydratePromise;
  },

  loadMessages: async (roomId) => {
    const { rooms } = getState();
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    if (room.type === "dm") {
      const currentUserId = useAuthStore.getState().user?.id;
      const peer = room.members.find((m) => m.userId !== currentUserId);
      if (peer && !peer.publicKey) return;
    }

    try {
      const encrypted = await getMessages(roomId);
      if (encrypted.length === 0) {
        setState((s) => {
          const msgs = new Map(s.messages);
          msgs.set(roomId, []);
          return { messages: msgs };
        });
        return;
      }
      const decrypted = await decryptMessages(encrypted, room);

      setState((s) => {
        const msgs = new Map(s.messages);
        msgs.set(roomId, decrypted);
        return { messages: msgs };
      });
    } catch (e) {
      console.error("Failed to load messages:", e);
      setState((s) => {
        const msgs = new Map(s.messages);
        msgs.set(roomId, []);
        return { messages: msgs };
      });
    }
  },

  sendMessage: async (roomId, plaintext) => {
    const { rooms } = getState();
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const cryptoStore = useChatCryptoStore.getState();
    const tempId = -Date.now();

    setState((s) => {
      const msgs = new Map(s.messages);
      const existing = msgs.get(roomId) ?? [];
      msgs.set(roomId, [
        ...existing,
        {
          id: tempId,
          roomId,
          senderId: "self",
          content: plaintext,
          contentType: "rich",
          createdAt: new Date().toISOString(),
          pending: true,
        },
      ]);
      return { messages: msgs };
    });

    try {
      const key = await getEncryptionKey(room, cryptoStore);
      const payload = await encrypt(key, plaintext);

      const result = await sendMessageAction(
        roomId,
        payload.ciphertext,
        payload.iv,
        cryptoStore.keyId,
        "rich",
      );

      setState((s) => {
        const msgs = new Map(s.messages);
        const existing = msgs.get(roomId) ?? [];
        msgs.set(
          roomId,
          existing.map((m) =>
            m.id === tempId
              ? { ...m, id: result.id, createdAt: result.createdAt, pending: false }
              : m,
          ),
        );
        return { messages: msgs };
      });
    } catch (e) {
      console.error("Failed to send message:", e);
      setState((s) => {
        const msgs = new Map(s.messages);
        const existing = msgs.get(roomId) ?? [];
        msgs.set(
          roomId,
          existing.map((m) =>
            m.id === tempId ? { ...m, pending: false, failed: true } : m,
          ),
        );
        return { messages: msgs, error: e instanceof Error ? e.message : "Failed to send message" };
      });
      try {
        const rooms = await getRooms();
        setState({ rooms });
      } catch { /* ignore */ }
    }
  },

  startDm: async (peerId) => {
    const cryptoStore = useChatCryptoStore.getState();
    if (!cryptoStore.privateKey || !cryptoStore.publicJwk) {
      throw new Error("Crypto not ready");
    }

    const roomId = await createDmRoom(peerId, null, null);

    const rooms = await getRooms();
    setState({ rooms, activeRoomId: roomId });

    return roomId;
  },

  searchUsers: async (query) => {
    return searchUsersAction(query);
  },

  connectSse: () => {
    if (sseSource) return;

    const es = new EventSource("/api/chat/sse");
    sseSource = es;

    es.onopen = () => setState({ sseConnected: true });

    es.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") return;

        if (data.type === "room_created" || data.type === "key_uploaded" || data.type === "rooms_changed") {
          const rooms = await getRooms();
          setState({ rooms });
          return;
        }

        if (data.type === "message") {
          const msg = data.payload as {
            id: number;
            roomId: string;
            senderId: string;
            ciphertext: string;
            iv: string;
            senderPublicKeyId: string | null;
            contentType: string;
            createdAt: string;
          };

          const { rooms, activeRoomId, messages } = getState();
          const room = rooms.find((r) => r.id === msg.roomId);
          if (!room) return;

          const existing = messages.get(msg.roomId) ?? [];
          if (existing.some((m) => m.id === msg.id)) return;

          try {
            const cryptoStore = useChatCryptoStore.getState();
            const key = await getEncryptionKey(room, cryptoStore);
            const content = await decrypt(key, msg.ciphertext, msg.iv);

            setState((s) => {
              const msgs = new Map(s.messages);
              const roomMsgs = msgs.get(msg.roomId) ?? [];

              const filtered = roomMsgs.filter(
                (m) => !(m.pending && m.senderId === "self" && m.content === content),
              );

              msgs.set(msg.roomId, [
                ...filtered,
                {
                  id: msg.id,
                  roomId: msg.roomId,
                  senderId: msg.senderId,
                  content,
                  contentType: msg.contentType,
                  createdAt: msg.createdAt,
                },
              ]);

              const unread = new Map(s.unreadCounts);
              const isSelf = msg.senderId === useAuthStore.getState().user?.id;
              if (msg.roomId !== activeRoomId && !isSelf) {
                unread.set(msg.roomId, (unread.get(msg.roomId) ?? 0) + 1);
              }

              return { messages: msgs, unreadCounts: unread };
            });
          } catch (e) {
            console.error("Failed to decrypt SSE message:", e);
          }
        }
      } catch {
        /* parse error */
      }
    };

    es.onerror = () => {
      setState({ sseConnected: false });
      if (sseSource) {
        sseSource.close();
        sseSource = null;
      }
      setTimeout(async () => {
        try {
          const rooms = await getRooms();
          setState({ rooms });
        } catch { /* ignore */ }
        getState().connectSse();
      }, 3000);
    };
  },

  disconnectSse: () => {
    if (sseSource) {
      sseSource.close();
      sseSource = null;
      setState({ sseConnected: false });
    }
  },
}));

// ── Helpers ──────────────────────────────────────────────────

function getCurrentUserId(): string {
  const authUser = useAuthStore.getState().user;
  if (!authUser) throw new Error("Not authenticated");
  return authUser.id;
}

async function getEncryptionKey(
  room: RoomInfo,
  cryptoStore: ReturnType<typeof useChatCryptoStore.getState>,
): Promise<CryptoKey> {
  const currentUserId = getCurrentUserId();

  if (room.type === "dm") {
    const peer = room.members.find(
      (m) => m.publicKey && m.userId !== currentUserId,
    );

    if (peer?.publicKey) {
      const peerJwk: JsonWebKey = JSON.parse(peer.publicKey);
      return cryptoStore.getDmKey(peerJwk);
    }

    throw new Error("Cannot derive encryption key for DM: peer has no public key");
  }

  if (room.encryptedRoomKey) {
    const creator = room.members.find((m) => m.userId === room.createdBy);
    if (creator?.publicKey) {
      const creatorJwk: JsonWebKey = JSON.parse(creator.publicKey);
      const payload = JSON.parse(room.encryptedRoomKey);
      return cryptoStore.getRoomKey(payload, creatorJwk);
    }
  }

  throw new Error("Cannot derive encryption key for room");
}

async function decryptMessages(
  encrypted: Awaited<ReturnType<typeof getMessages>>,
  room: RoomInfo,
): Promise<DecryptedMessage[]> {
  const cryptoStore = useChatCryptoStore.getState();
  const key = await getEncryptionKey(room, cryptoStore);

  const results: DecryptedMessage[] = [];

  for (const msg of encrypted) {
    try {
      const content = await decrypt(key, msg.ciphertext, msg.iv);
      results.push({
        id: msg.id,
        roomId: room.id,
        senderId: msg.senderId,
        content,
        contentType: msg.contentType,
        createdAt: msg.createdAt,
      });
    } catch {
      results.push({
        id: msg.id,
        roomId: room.id,
        senderId: msg.senderId,
        content: "[Decryption failed]",
        contentType: "text",
        createdAt: msg.createdAt,
        failed: true,
      });
    }
  }

  return results;
}
