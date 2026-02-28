"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Users,
  BarChart3,
  MessageCircle,
  Play,
  UserPlus,
  Search,
  X,
  Crown,
  LogOut,
  UserMinus,
} from "lucide-react";
import { useGroupStore, type GroupInfo } from "../store/groupStore";
import { useAuthStore } from "../store/authStore";
import { useChatStore, type DecryptedMessage } from "../store/chatStore";
import { GroupBoard } from "./GroupBoard";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import questions from "../data/questions.json";
import type { Question } from "../types/question";

const allQuestions = questions as Question[];

type Tab = "members" | "board" | "chat";

export function GroupDetail() {
  const groupDetail = useGroupStore((s) => s.groupDetail);
  const detailLoading = useGroupStore((s) => s.detailLoading);
  const activeSession = useGroupStore((s) => s.activeSession);
  const setActiveGroup = useGroupStore((s) => s.setActiveGroup);
  const joinSession = useGroupStore((s) => s.joinSession);
  const authUser = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<Tab>("members");

  if (detailLoading || !groupDetail) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[var(--bg-surface)] border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    );
  }

  const { group, sessions, board } = groupDetail;
  const isAdmin = group.myRole === "admin";

  const activeQuestion = activeSession
    ? allQuestions.find((q) => q.id === activeSession.questionId) ?? null
    : null;

  const handleJoinSession = () => {
    if (activeSession) joinSession(activeSession, group);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-primary)] shrink-0">
        <button
          className="flex sm:hidden items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)] transition-[color,background-color] duration-200"
          onClick={() => setActiveGroup(null)}
          aria-label="Back to groups"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-bold text-[var(--text)] truncate font-[family-name:var(--font-display)]">
              {group.name}
            </span>
            {isAdmin ? (
              <Crown size={12} className="text-[var(--accent)] shrink-0" />
            ) : null}
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">
            {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
          </span>
        </div>

        {isAdmin ? (
          <StartSessionButton groupId={group.id} />
        ) : null}
      </div>

      {/* Active session join banner */}
      {activeSession && activeQuestion ? (
        <button
          className="flex items-center gap-3 px-4 py-2.5 bg-[var(--accent)]/8 border-b border-[var(--accent)]/20 text-left transition-[background-color] duration-150 hover:bg-[var(--accent)]/15 shrink-0"
          onClick={handleJoinSession}
        >
          <Play size={14} className="text-[var(--accent)] shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[12px] font-semibold text-[var(--accent)]">
              Active Session
            </span>
            <span className="text-[11px] text-[var(--text-muted)] ml-2 truncate">
              #{activeQuestion.id} {activeQuestion.title}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[var(--accent)] shrink-0">
            Join
          </span>
        </button>
      ) : null}

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] bg-[var(--bg-primary)] shrink-0">
        {([
          { id: "members" as Tab, label: "Members", icon: Users },
          { id: "board" as Tab, label: "Board", icon: BarChart3 },
          { id: "chat" as Tab, label: "Chat", icon: MessageCircle },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold transition-[color,border-color] duration-150 border-b-2 ${
              tab === id
                ? "text-[var(--accent)] border-b-[var(--accent)]"
                : "text-[var(--text-muted)] border-b-transparent hover:text-[var(--text)]"
            }`}
            onClick={() => setTab(id)}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "members" ? (
          <MembersTab group={group} isAdmin={isAdmin} currentUserId={authUser?.id ?? ""} />
        ) : tab === "board" ? (
          <GroupBoard board={board} sessions={sessions} />
        ) : (
          <GroupChatTab chatRoomId={group.chatRoomId} />
        )}
      </div>
    </div>
  );
}

// ── Members Tab ──────────────────────────────────────────────

function MembersTab({
  group,
  isAdmin,
  currentUserId,
}: {
  group: GroupInfo;
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [showInvite, setShowInvite] = useState(false);
  const leaveGroup = useGroupStore((s) => s.leaveGroup);
  const removeMember = useGroupStore((s) => s.removeMember);
  const [leaving, setLeaving] = useState(false);

  const handleLeave = useCallback(async () => {
    setLeaving(true);
    try {
      await leaveGroup(group.id);
    } catch { /* error in store */ }
    setLeaving(false);
  }, [leaveGroup, group.id]);

  return (
    <div className="flex flex-col">
      {isAdmin ? (
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-[12px] font-semibold bg-[var(--accent)] text-[var(--accent-text-on)] transition-[background-color] duration-200 hover:bg-[var(--accent-hover)]"
            onClick={() => setShowInvite(true)}
          >
            <UserPlus size={13} />
            Invite Member
          </button>
        </div>
      ) : null}

      <div className="divide-y divide-[var(--border)]">
        {group.members.map((member) => (
          <div key={member.userId} className="flex items-center gap-3 px-4 py-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[12px] font-bold shrink-0">
              {member.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-medium text-[var(--text)] truncate">
                  {member.displayName}
                </span>
                {member.role === "admin" ? (
                  <Crown size={11} className="text-[var(--accent)] shrink-0" />
                ) : null}
                {member.userId === currentUserId ? (
                  <span className="text-[10px] text-[var(--text-muted)]">(you)</span>
                ) : null}
              </div>
              <span className="text-[11px] text-[var(--text-muted)]">
                @{member.username}
              </span>
            </div>
            {isAdmin && member.userId !== currentUserId ? (
              <button
                className="flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition-[color,background-color] duration-150"
                onClick={() => removeMember(group.id, member.userId)}
                aria-label={`Remove ${member.displayName}`}
                title="Remove"
              >
                <UserMinus size={13} />
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="px-4 py-4 border-t border-[var(--border)] mt-auto">
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-[12px] font-semibold text-[var(--red)] bg-[var(--red)]/10 hover:bg-[var(--red)]/20 transition-[background-color] duration-200 disabled:opacity-50"
          onClick={handleLeave}
          disabled={leaving}
        >
          <LogOut size={13} />
          {leaving ? "Leaving\u2026" : "Leave Group"}
        </button>
      </div>

      {showInvite ? (
        <InviteModal groupId={group.id} onClose={() => setShowInvite(false)} />
      ) : null}
    </div>
  );
}

function InviteModal({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; username: string; displayName: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const searchUsers = useGroupStore((s) => s.searchUsers);
  const inviteMember = useGroupStore((s) => s.inviteMember);

  const handleSearch = useCallback(
    async (q: string) => {
      setQuery(q);
      setLocalError(null);
      setSuccessMsg(null);
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const r = await searchUsers(q, groupId);
        setResults(r);
      } catch {
        setResults([]);
      }
      setSearching(false);
    },
    [searchUsers, groupId],
  );

  const handleInvite = useCallback(
    async (user: { id: string; username: string; displayName: string }) => {
      setInviting(user.id);
      setLocalError(null);
      setSuccessMsg(null);
      try {
        await inviteMember(groupId, user.username);
        setSuccessMsg(`Invited ${user.displayName}`);
        setResults((prev) => prev.filter((r) => r.id !== user.id));
      } catch (e) {
        setLocalError(e instanceof Error ? e.message : "Failed to invite");
      }
      setInviting(null);
    },
    [inviteMember, groupId],
  );

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
            Invite Member
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
              placeholder="Search by username\u2026"
              className="flex-1 bg-transparent text-[13px] text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none"
              autoFocus
            />
          </div>
        </div>

        {localError ? (
          <div className="mx-4 mb-2 px-3 py-2 rounded-[var(--radius-md)] bg-red-500/10 border border-red-500/20 text-[12px] text-red-400 leading-[1.5]">
            {localError}
          </div>
        ) : null}

        {successMsg ? (
          <div className="mx-4 mb-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[12px] text-[var(--accent)] leading-[1.5]">
            {successMsg}
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
                onClick={() => handleInvite(user)}
                disabled={inviting === user.id}
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
                <UserPlus size={14} className="text-[var(--text-muted)] shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Start Session Button ─────────────────────────────────────

const DURATION_PRESETS = [
  { label: "15m", seconds: 15 * 60 },
  { label: "20m", seconds: 20 * 60 },
  { label: "30m", seconds: 30 * 60 },
  { label: "45m", seconds: 45 * 60 },
  { label: "60m", seconds: 60 * 60 },
] as const;

function StartSessionButton({ groupId }: { groupId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [duration, setDuration] = useState(30 * 60);
  const [questionSearch, setQuestionSearch] = useState("");
  const [starting, setStarting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const startSession = useGroupStore((s) => s.startSession);

  const filteredQuestions = useMemo(() => {
    if (!questionSearch) return allQuestions.slice(0, 15);
    const q = questionSearch.toLowerCase();
    return allQuestions
      .filter(
        (question) =>
          question.title.toLowerCase().includes(q) ||
          question.category.toLowerCase().includes(q) ||
          String(question.id).includes(q),
      )
      .slice(0, 15);
  }, [questionSearch]);

  const handleStart = useCallback(async () => {
    if (!selectedQuestion) return;
    setStarting(true);
    setLocalError(null);
    try {
      await startSession(groupId, selectedQuestion, duration);
      setShowForm(false);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Failed to start session");
    }
    setStarting(false);
  }, [groupId, selectedQuestion, duration, startSession]);

  if (!showForm) {
    return (
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-[12px] font-semibold bg-[var(--accent)] text-[var(--accent-text-on)] transition-[background-color] duration-200 hover:bg-[var(--accent-hover)] shrink-0"
        onClick={() => setShowForm(true)}
      >
        <Play size={12} />
        Start Session
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-[6px] flex items-center justify-center z-[200] animate-fade-in-fast overscroll-contain"
      onClick={() => setShowForm(false)}
    >
      <div
        className="bg-[var(--bg-primary)] border border-[var(--border-bright)] rounded-[var(--radius-lg)] w-[420px] max-h-[520px] shadow-[var(--shadow-dialog)] animate-fade-in-up-dialog flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h3 className="text-[14px] font-bold text-[var(--text)] font-[family-name:var(--font-display)]">
            Start Group Session
          </h3>
          <button
            className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)] transition-[color,background-color] duration-200"
            onClick={() => setShowForm(false)}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-3 flex flex-col gap-4 overflow-y-auto">
          {/* Question picker */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">
              Question
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] focus-within:border-[var(--accent)] transition-[border-color] duration-200 mb-2">
              <Search size={14} className="text-[var(--text-muted)] shrink-0" />
              <input
                type="text"
                value={questionSearch}
                onChange={(e) => setQuestionSearch(e.target.value)}
                placeholder="Search questions\u2026"
                className="flex-1 bg-transparent text-[13px] text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none"
              />
            </div>
            <div className="max-h-[180px] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)]">
              {filteredQuestions.map((q) => (
                <button
                  key={q.id}
                  className={`w-full text-left px-3 py-2 text-[12px] transition-[background-color,color] duration-150 border-b border-[var(--border)] last:border-b-0 ${
                    selectedQuestion === q.id
                      ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "text-[var(--text)] hover:bg-[var(--bg-elevated)]"
                  }`}
                  onClick={() => setSelectedQuestion(q.id)}
                >
                  <span className="font-medium">#{q.id}</span>{" "}
                  <span>{q.title}</span>{" "}
                  <span
                    className={`text-[10px] font-semibold ${
                      q.difficulty === "Easy"
                        ? "text-green-400"
                        : q.difficulty === "Medium"
                          ? "text-yellow-400"
                          : "text-red-400"
                    }`}
                  >
                    {q.difficulty}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration picker */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">
              Timer Duration
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p.seconds}
                  className={`px-3 py-1.5 rounded-[var(--radius-md)] text-[12px] font-semibold transition-[background-color,color] duration-150 ${
                    duration === p.seconds
                      ? "bg-[var(--accent)] text-[var(--accent-text-on)]"
                      : "bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-elevated)]"
                  }`}
                  onClick={() => setDuration(p.seconds)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {localError ? (
            <div className="px-3 py-2 rounded-[var(--radius-md)] bg-red-500/10 border border-red-500/20 text-[12px] text-red-400 leading-[1.5]">
              {localError}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
          <button
            className="px-3 py-1.5 rounded-[var(--radius-md)] text-[12px] font-semibold bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-bright)] hover:text-[var(--text)] hover:bg-[var(--bg-elevated)] transition-[background-color,color] duration-200"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1.5 rounded-[var(--radius-md)] text-[12px] font-semibold bg-[var(--accent)] text-[var(--accent-text-on)] transition-[background-color] duration-200 hover:bg-[var(--accent-hover)] disabled:opacity-50"
            onClick={handleStart}
            disabled={starting || !selectedQuestion}
          >
            {starting ? "Starting\u2026" : "Start Session"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Group Chat Tab ───────────────────────────────────────────

function GroupChatTab({ chatRoomId }: { chatRoomId: string | null }) {
  const rooms = useChatStore((s) => s.rooms);
  const chatLoading = useChatStore((s) => s.loading);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const hydrate = useChatStore((s) => s.hydrate);
  const authUser = useAuthStore((s) => s.user);

  const room = useMemo(
    () => (chatRoomId ? rooms.find((r) => r.id === chatRoomId) : undefined),
    [rooms, chatRoomId],
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (chatRoomId && !chatLoading && rooms.length > 0) loadMessages(chatRoomId);
  }, [chatRoomId, chatLoading, rooms.length, loadMessages]);

  const messagesFromStore = useChatStore(
    useCallback(
      (s: { messages: Map<string, DecryptedMessage[]> }) =>
        chatRoomId ? s.messages.get(chatRoomId) : undefined,
      [chatRoomId],
    ),
  );
  const messages = messagesFromStore ?? [];

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = useCallback(
    (content: string) => {
      if (chatRoomId) sendMessage(chatRoomId, content);
    },
    [sendMessage, chatRoomId],
  );

  const senderNames = useMemo(() => {
    const map = new Map<string, string>();
    if (room) {
      for (const m of room.members) {
        map.set(m.userId, m.displayName || m.username);
      }
    }
    return map;
  }, [room]);

  if (!chatRoomId) {
    return (
      <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-muted)]">
        Chat not available
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <MessageCircle size={16} className="text-[var(--text-muted)]" />
            <p className="text-[11px] text-[var(--text-muted)]">
              No messages yet. Say hello!
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
      <ChatInput onSend={handleSend} />
    </div>
  );
}
