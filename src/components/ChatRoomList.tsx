"use client";

import { useCallback, useState, useMemo } from "react";
import { Plus, Search, MessageCircle, Users, Lock, X } from "lucide-react";
import { useChatStore } from "../store/chatStore";
import { useAuthStore } from "../store/authStore";
import type { RoomInfo } from "../../app/actions/chat";

export function ChatRoomList() {
  const rooms = useChatStore((s) => s.rooms);
  const activeRoomId = useChatStore((s) => s.activeRoomId);
  const setActiveRoom = useChatStore((s) => s.setActiveRoom);
  const unreadCounts = useChatStore((s) => s.unreadCounts);
  const authUser = useAuthStore((s) => s.user);
  const [showNewChat, setShowNewChat] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Lock size={13} className="text-[var(--accent)]" />
          <h2 className="text-[13px] font-bold text-[var(--text)] font-[family-name:var(--font-display)]">
            Sighted Chat
          </h2>
        </div>
        <button
          className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)] transition-[color,background-color] duration-200"
          onClick={() => setShowNewChat(true)}
          aria-label="New chat"
          title="New Chat"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-3">
            <MessageCircle size={28} className="text-[var(--text-muted)]" />
            <p className="text-[12px] text-[var(--text-muted)] leading-[1.6]">
              No conversations yet. Start a new chat to begin.
            </p>
            <button
              className="px-3 py-1.5 rounded-[var(--radius-md)] text-[12px] font-semibold bg-[var(--accent)] text-[var(--accent-text-on)] transition-[background-color] duration-200 hover:bg-[var(--accent-hover)]"
              onClick={() => setShowNewChat(true)}
            >
              New Chat
            </button>
          </div>
        ) : (
          rooms.map((room) => (
            <RoomItem
              key={room.id}
              room={room}
              active={room.id === activeRoomId}
              unread={unreadCounts.get(room.id) ?? 0}
              currentUserId={authUser?.id ?? ""}
              onClick={() => setActiveRoom(room.id)}
            />
          ))
        )}
      </div>

      {showNewChat ? (
        <NewChatModal onClose={() => setShowNewChat(false)} />
      ) : null}
    </div>
  );
}

function RoomItem({
  room,
  active,
  unread,
  currentUserId,
  onClick,
}: {
  room: RoomInfo;
  active: boolean;
  unread: number;
  currentUserId: string;
  onClick: () => void;
}) {
  const displayName = useMemo(() => {
    if (room.type === "group") return room.name ?? "Group";
    const peer = room.members.find((m) => m.userId !== currentUserId);
    return peer?.displayName ?? peer?.username ?? "Unknown";
  }, [room, currentUserId]);

  const expiresIn = useMemo(() => {
    const diff = new Date(room.expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);
    return `${hours}h ${mins}m`;
  }, [room.expiresAt]);

  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-[background-color,border-color] duration-150 border-l-2 ${
        active
          ? "bg-[var(--bg-surface)] border-l-[var(--accent)]"
          : unread > 0
            ? "hover:bg-[var(--bg-surface)]/50 border-l-[var(--accent)]/60"
            : "hover:bg-[var(--bg-surface)]/50 border-l-transparent"
      }`}
      onClick={onClick}
    >
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
          room.type === "dm"
            ? "bg-[var(--accent)]/15 text-[var(--accent)]"
            : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
        }`}
      >
        {room.type === "dm" ? (
          <MessageCircle size={15} />
        ) : (
          <Users size={15} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[13px] truncate ${
              unread > 0
                ? "font-bold text-[var(--text)]"
                : "font-medium text-[var(--text)]"
            }`}
          >
            {displayName}
          </span>
          {unread > 0 ? (
            <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[var(--accent)] text-[var(--accent-text-on)] text-[10px] font-bold px-1 shrink-0">
              {unread}
            </span>
          ) : null}
        </div>
        <span
          className={`text-[10px] tabular-nums ${
            unread > 0 ? "text-[var(--text)]" : "text-[var(--text-muted)]"
          }`}
        >
          Expires in {expiresIn}
        </span>
      </div>
    </button>
  );
}

function NewChatModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: string; username: string; displayName: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const searchUsers = useChatStore((s) => s.searchUsers);
  const startDm = useChatStore((s) => s.startDm);
  const clearError = useChatStore((s) => s.clearError);

  const handleSearch = useCallback(
    async (q: string) => {
      setQuery(q);
      setLocalError(null);
      clearError();
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const r = await searchUsers(q);
        setResults(r);
      } catch {
        setResults([]);
      }
      setSearching(false);
    },
    [searchUsers, clearError],
  );

  const handleStartDm = useCallback(
    async (peerId: string) => {
      setStarting(true);
      setLocalError(null);
      clearError();
      try {
        await startDm(peerId);
        onClose();
      } catch {
        const err = useChatStore.getState().error;
        setLocalError(err ?? "Failed to start chat. The user may not have opened chat yet.");
      }
      setStarting(false);
    },
    [startDm, onClose, clearError],
  );

  const displayError = localError;

  return (
    <div
      className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-[6px] flex items-center justify-center z-[200] animate-fade-in-fast overscroll-contain"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-primary)] border border-[var(--border-bright)] rounded-[var(--radius-lg)] w-[360px] max-h-[420px] shadow-[var(--shadow-dialog)] animate-fade-in-up-dialog flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h3 className="text-[14px] font-bold text-[var(--text)] font-[family-name:var(--font-display)]">
            New Chat
          </h3>
          <button
            className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)] transition-[color,background-color] duration-200"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] focus-within:border-[var(--accent)] transition-[border-color] duration-200">
            <Search size={14} className="text-[var(--text-muted)] shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by username…"
              className="flex-1 bg-transparent text-[13px] text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none"
              autoFocus
            />
          </div>
        </div>

        {displayError ? (
          <div className="mx-4 mb-2 px-3 py-2 rounded-[var(--radius-md)] bg-red-500/10 border border-red-500/20 text-[12px] text-red-400 leading-[1.5]">
            {displayError}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {searching ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-[var(--bg-surface)] border-t-[var(--accent)] rounded-full animate-spin" />
            </div>
          ) : results.length === 0 && query.length >= 2 ? (
            <p className="text-center text-[12px] text-[var(--text-muted)] py-6">
              No users found
            </p>
          ) : (
            results.map((user) => (
              <button
                key={user.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] hover:bg-[var(--bg-surface)] transition-[background-color] duration-150 disabled:opacity-50"
                onClick={() => handleStartDm(user.id)}
                disabled={starting}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[12px] font-bold shrink-0">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[13px] font-medium text-[var(--text)] truncate">
                    {user.displayName}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate">
                    @{user.username}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
