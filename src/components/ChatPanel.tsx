"use client";

import { useCallback, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, Lock, Shield, ShieldAlert } from "lucide-react";
import { useChatStore, type DecryptedMessage } from "../store/chatStore";
import { useAuthStore } from "../store/authStore";

const EMPTY_MESSAGES: DecryptedMessage[] = [];
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ChatRoomList } from "./ChatRoomList";

export function ChatPanel() {
  const activeRoomId = useChatStore((s) => s.activeRoomId);
  const rooms = useChatStore((s) => s.rooms);
  const loading = useChatStore((s) => s.loading);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[var(--bg-surface)] border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    );
  }

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  return (
    <div className="flex h-full">
      <div
        className={`${
          activeRoomId ? "hidden sm:flex" : "flex"
        } w-full sm:w-[260px] flex-col border-r border-[var(--border)] bg-[var(--bg-primary)] shrink-0`}
      >
        <ChatRoomList />
      </div>

      <div
        className={`${
          activeRoomId ? "flex" : "hidden sm:flex"
        } flex-1 flex-col min-w-0 bg-[var(--bg-deep)]`}
      >
        {activeRoom ? (
          <ActiveRoomView room={activeRoom} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--accent)]/10">
        <Shield size={22} className="text-[var(--accent)]" />
      </div>
      <h3 className="text-[14px] font-bold text-[var(--text)] font-[family-name:var(--font-display)]">
        End-to-End Encrypted
      </h3>
      <p className="text-[12px] text-[var(--text-muted)] leading-[1.6] max-w-[240px]">
        Select a conversation or start a new chat. All messages are encrypted and auto-delete after 24 hours.
      </p>
    </div>
  );
}

function ActiveRoomView({
  room,
}: {
  room: ReturnType<typeof useChatStore.getState>["rooms"][number];
}) {
  const messagesFromStore = useChatStore(
    useCallback((s: { messages: Map<string, DecryptedMessage[]> }) => s.messages.get(room.id), [room.id]),
  );
  const messages = messagesFromStore ?? EMPTY_MESSAGES;
  const sendMessage = useChatStore((s) => s.sendMessage);
  const setActiveRoom = useChatStore((s) => s.setActiveRoom);
  const authUser = useAuthStore((s) => s.user);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = useCallback(
    (content: string) => {
      sendMessage(room.id, content);
    },
    [sendMessage, room.id],
  );

  const roomTitle = useMemo(() => {
    if (room.type === "group") return room.name ?? "Group";
    const peer = room.members.find((m) => m.userId !== authUser?.id);
    return peer?.displayName ?? peer?.username ?? "Chat";
  }, [room, authUser]);

  const expiresIn = useMemo(() => {
    const diff = new Date(room.expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);
    return `${hours}h ${mins}m`;
  }, [room.expiresAt]);

  const senderNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of room.members) {
      map.set(m.userId, m.displayName || m.username);
    }
    return map;
  }, [room.members]);

  const peerKeyMissing = useMemo(() => {
    if (room.type !== "dm") return false;
    const peer = room.members.find((m) => m.userId !== authUser?.id);
    return peer ? !peer.publicKey : false;
  }, [room, authUser?.id]);

  const refreshRooms = useChatStore((s) => s.refreshRooms);
  useEffect(() => {
    if (!peerKeyMissing) return;
    const id = setInterval(refreshRooms, 5000);
    return () => clearInterval(id);
  }, [peerKeyMissing, refreshRooms]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-primary)] shrink-0">
        <button
          className="flex sm:hidden items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)] transition-[color,background-color] duration-200"
          onClick={() => setActiveRoom(null)}
          aria-label="Back to rooms"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Lock size={11} className="text-[var(--accent)] shrink-0" />
            <span className="text-[13px] font-bold text-[var(--text)] truncate font-[family-name:var(--font-display)]">
              {roomTitle}
            </span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
            E2E encrypted &middot; Expires in {expiresIn}
          </span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2"
      >
        {peerKeyMissing ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <ShieldAlert size={22} className="text-amber-400" />
            <p className="text-[12px] text-[var(--text-muted)] leading-[1.6] max-w-[240px]">
              Waiting for <strong className="text-[var(--text)]">{roomTitle}</strong> to open their chat panel. You can send messages once they come online.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <Lock size={16} className="text-[var(--text-muted)]" />
            <p className="text-[11px] text-[var(--text-muted)]">
              Messages are end-to-end encrypted
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isSelf={msg.senderId === authUser?.id || msg.senderId === "self"}
              senderName={senderNames.get(msg.senderId) ?? "Unknown"}
            />
          ))
        )}
      </div>

      {peerKeyMissing ? (
        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--bg-surface)] text-[12px] text-[var(--text-muted)]">
            <ShieldAlert size={14} className="text-amber-400 shrink-0" />
            Encryption keys pending{"\u2026"} Chat will be available once {roomTitle} opens their chat.
          </div>
        </div>
      ) : (
        <ChatInput onSend={handleSend} />
      )}
    </div>
  );
}
