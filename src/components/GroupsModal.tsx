"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { X, Plus, Users, Check, XIcon, Bell } from "lucide-react";
import { useGroupStore } from "../store/groupStore";
import { GroupDetail } from "./GroupDetail";

const MIN_WIDTH = 420;
const MAX_WIDTH_RATIO = 0.92;
const DEFAULT_WIDTH = 760;
const STORAGE_KEY = "sighted75:groups-width";

function getStoredWidth(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) {
      const n = Number(v);
      if (n >= MIN_WIDTH) return n;
    }
  } catch { /* ignore */ }
  return DEFAULT_WIDTH;
}

export function GroupsModal() {
  const open = useGroupStore((s) => s.open);
  const setOpen = useGroupStore((s) => s.setOpen);
  const hydrate = useGroupStore((s) => s.hydrate);
  const [width, setWidth] = useState(getStoredWidth);
  const dragging = useRef(false);

  useEffect(() => {
    if (open) hydrate();
  }, [open, hydrate]);

  const handleClose = useCallback(() => {
    setOpen(false);
    useGroupStore.getState().setActiveGroup(null);
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleClose]);

  const onDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return;
      const maxW = window.innerWidth * MAX_WIDTH_RATIO;
      const newWidth = Math.min(maxW, Math.max(MIN_WIDTH, window.innerWidth - ev.clientX));
      setWidth(newWidth);
    };

    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      setWidth((w) => {
        try { localStorage.setItem(STORAGE_KEY, String(Math.round(w))); } catch { /* ignore */ }
        return w;
      });
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end animate-fade-in-fast"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-[var(--overlay-bg)] backdrop-blur-[4px]" />

      <div
        className="relative h-full bg-[var(--bg-primary)] border-l border-[var(--border-bright)] shadow-[var(--shadow-dialog)] animate-slide-in-right flex flex-col"
        style={{ width: `${Math.round(width)}px`, maxWidth: `${MAX_WIDTH_RATIO * 100}vw` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 group"
          onPointerDown={onDragStart}
        >
          <div className="absolute inset-y-0 left-0 w-0.5 bg-transparent group-hover:bg-[var(--accent)]/40 transition-[background-color] duration-150" />
        </div>

        <div className="absolute top-3 right-3 z-10">
          <button
            className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)] transition-[color,background-color] duration-200"
            onClick={handleClose}
            aria-label="Close groups"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0">
          <GroupsPanel />
        </div>
      </div>
    </div>
  );
}

function GroupsPanel() {
  const activeGroupId = useGroupStore((s) => s.activeGroupId);
  const loading = useGroupStore((s) => s.loading);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[var(--bg-surface)] border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div
        className={`${
          activeGroupId ? "hidden sm:flex" : "flex"
        } w-full sm:w-[280px] flex-col border-r border-[var(--border)] bg-[var(--bg-primary)] shrink-0`}
      >
        <GroupsList />
      </div>

      <div
        className={`${
          activeGroupId ? "flex" : "hidden sm:flex"
        } flex-1 flex-col min-w-0 bg-[var(--bg-deep)]`}
      >
        {activeGroupId ? (
          <GroupDetail />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
            <Users size={28} className="text-[var(--text-muted)]" />
            <h3 className="text-[14px] font-bold text-[var(--text)] font-[family-name:var(--font-display)]">
              Groups
            </h3>
            <p className="text-[12px] text-[var(--text-muted)] leading-[1.6] max-w-[240px]">
              Select a group or create a new one to start collaborating.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupsList() {
  const groups = useGroupStore((s) => s.groups);
  const invitations = useGroupStore((s) => s.invitations);
  const activeGroupId = useGroupStore((s) => s.activeGroupId);
  const setActiveGroup = useGroupStore((s) => s.setActiveGroup);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Users size={13} className="text-[var(--accent)]" />
          <h2 className="text-[13px] font-bold text-[var(--text)] font-[family-name:var(--font-display)]">
            Groups
          </h2>
        </div>
        <button
          className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)] transition-[color,background-color] duration-200"
          onClick={() => setShowCreate(true)}
          aria-label="Create group"
          title="Create Group"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {invitations.length > 0 ? (
          <div className="border-b border-[var(--border)]">
            <div className="flex items-center gap-1.5 px-4 py-2">
              <Bell size={12} className="text-[var(--accent)]" />
              <span className="text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wider">
                Invitations ({invitations.length})
              </span>
            </div>
            {invitations.map((inv) => (
              <InvitationItem key={inv.id} invitation={inv} />
            ))}
          </div>
        ) : null}

        {groups.length === 0 && invitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-3">
            <Users size={28} className="text-[var(--text-muted)]" />
            <p className="text-[12px] text-[var(--text-muted)] leading-[1.6]">
              No groups yet. Create one to get started.
            </p>
            <button
              className="px-3 py-1.5 rounded-[var(--radius-md)] text-[12px] font-semibold bg-[var(--accent)] text-[var(--accent-text-on)] transition-[background-color] duration-200 hover:bg-[var(--accent-hover)]"
              onClick={() => setShowCreate(true)}
            >
              Create Group
            </button>
          </div>
        ) : (
          groups.map((group) => (
            <button
              key={group.id}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-[background-color,border-color] duration-150 border-l-2 ${
                group.id === activeGroupId
                  ? "bg-[var(--bg-surface)] border-l-[var(--accent)]"
                  : "hover:bg-[var(--bg-surface)]/50 border-l-transparent"
              }`}
              onClick={() => setActiveGroup(group.id)}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] shrink-0">
                <Users size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-medium text-[var(--text)] truncate block">
                  {group.name}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                  {group.myRole === "admin" ? " \u00b7 Admin" : ""}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {showCreate ? (
        <CreateGroupModal onClose={() => setShowCreate(false)} />
      ) : null}
    </div>
  );
}

function InvitationItem({ invitation }: { invitation: { id: number; groupName: string; inviterDisplayName: string } }) {
  const respondToInvitation = useGroupStore((s) => s.respondToInvitation);
  const [responding, setResponding] = useState(false);

  const handleRespond = useCallback(
    async (accept: boolean) => {
      setResponding(true);
      try {
        await respondToInvitation(invitation.id, accept);
      } catch { /* error set in store */ }
      setResponding(false);
    },
    [respondToInvitation, invitation.id],
  );

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="flex-1 min-w-0">
        <span className="text-[12px] font-medium text-[var(--text)] truncate block">
          {invitation.groupName}
        </span>
        <span className="text-[10px] text-[var(--text-muted)]">
          from {invitation.inviterDisplayName}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          className="flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-[background-color] duration-150 disabled:opacity-40"
          onClick={() => handleRespond(true)}
          disabled={responding}
          aria-label="Accept invitation"
          title="Accept"
        >
          <Check size={13} />
        </button>
        <button
          className="flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--red)]/10 text-[var(--red)] hover:bg-[var(--red)]/20 transition-[background-color] duration-150 disabled:opacity-40"
          onClick={() => handleRespond(false)}
          disabled={responding}
          aria-label="Decline invitation"
          title="Decline"
        >
          <XIcon size={13} />
        </button>
      </div>
    </div>
  );
}

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const createGroup = useGroupStore((s) => s.createGroup);
  const setActiveGroup = useGroupStore((s) => s.setActiveGroup);

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      setCreating(true);
      setLocalError(null);
      try {
        const id = await createGroup(name.trim());
        setActiveGroup(id);
        onClose();
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : "Failed to create group");
      }
      setCreating(false);
    },
    [name, createGroup, setActiveGroup, onClose],
  );

  return (
    <div
      className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-[6px] flex items-center justify-center z-[200] animate-fade-in-fast overscroll-contain"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-primary)] border border-[var(--border-bright)] rounded-[var(--radius-lg)] w-[360px] shadow-[var(--shadow-dialog)] animate-fade-in-up-dialog flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h3 className="text-[14px] font-bold text-[var(--text)] font-[family-name:var(--font-display)]">
            Create Group
          </h3>
          <button
            className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)] transition-[color,background-color] duration-200"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="px-4 py-4 flex flex-col gap-3">
          <div>
            <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Blind 75 Study Group"
              maxLength={50}
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] text-[13px] text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-[border-color] duration-200"
              autoFocus
            />
          </div>

          {localError ? (
            <div className="px-3 py-2 rounded-[var(--radius-md)] bg-red-500/10 border border-red-500/20 text-[12px] text-red-400 leading-[1.5]">
              {localError}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="px-3 py-1.5 rounded-[var(--radius-md)] text-[12px] font-semibold bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-bright)] hover:text-[var(--text)] hover:bg-[var(--bg-elevated)] transition-[background-color,color] duration-200"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-[var(--radius-md)] text-[12px] font-semibold bg-[var(--accent)] text-[var(--accent-text-on)] transition-[background-color] duration-200 hover:bg-[var(--accent-hover)] disabled:opacity-50"
              disabled={creating || !name.trim()}
            >
              {creating ? "Creating\u2026" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
