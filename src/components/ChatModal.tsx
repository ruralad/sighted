"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { useChatStore } from "../store/chatStore";
import { ChatPanel } from "./ChatPanel";

export function ChatModal() {
  const open = useChatStore((s) => s.open);
  const setOpen = useChatStore((s) => s.setOpen);
  const hydrate = useChatStore((s) => s.hydrate);

  useEffect(() => {
    if (open) {
      hydrate();
    }
  }, [open, hydrate]);

  const handleClose = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end animate-fade-in-fast"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-[var(--overlay-bg)] backdrop-blur-[4px]" />

      <div
        className="relative w-full max-w-[680px] h-full bg-[var(--bg-primary)] border-l border-[var(--border-bright)] shadow-[var(--shadow-dialog)] animate-slide-in-right flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-3 right-3 z-10">
          <button
            className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)] transition-[color,background-color] duration-200"
            onClick={handleClose}
            aria-label="Close chat"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}
