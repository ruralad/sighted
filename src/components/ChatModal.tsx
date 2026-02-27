"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { X } from "lucide-react";
import { useChatStore } from "../store/chatStore";
import { ChatPanel } from "./ChatPanel";

const MIN_WIDTH = 380;
const MAX_WIDTH_RATIO = 0.9;
const DEFAULT_WIDTH = 680;
const STORAGE_KEY = "sighted75:chat-width";

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

export function ChatModal() {
  const open = useChatStore((s) => s.open);
  const setOpen = useChatStore((s) => s.setOpen);
  const hydrate = useChatStore((s) => s.hydrate);
  const [width, setWidth] = useState(getStoredWidth);
  const dragging = useRef(false);

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
