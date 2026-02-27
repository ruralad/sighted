"use client";

import { useMemo } from "react";
import { ShieldAlert, Clock } from "lucide-react";
import type { DecryptedMessage } from "../store/chatStore";

interface ChatMessageProps {
  message: DecryptedMessage;
  isSelf: boolean;
  senderName: string;
}

export function ChatMessage({ message, isSelf, senderName }: ChatMessageProps) {
  const time = useMemo(() => {
    const d = new Date(message.createdAt);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [message.createdAt]);

  return (
    <div
      className={`flex flex-col gap-0.5 max-w-[80%] ${
        isSelf ? "self-end items-end" : "self-start items-start"
      }`}
    >
      {!isSelf ? (
        <span className="text-[11px] font-medium text-[var(--text-muted)] px-1">
          {senderName}
        </span>
      ) : null}

      <div
        className={`relative rounded-[var(--radius-lg)] px-3 py-2 text-[13px] leading-[1.6] break-words ${
          message.failed
            ? "bg-[var(--red)]/10 border border-[var(--red)]/30"
            : isSelf
              ? "bg-[var(--accent)] text-[var(--accent-text-on)]"
              : "bg-[var(--bg-surface)] text-[var(--text)] border border-[var(--border)]"
        } ${message.pending ? "opacity-60" : ""}`}
      >
        {message.failed && message.content === "[Decryption failed]" ? (
          <span className="flex items-center gap-1.5 text-[var(--red)]">
            <ShieldAlert size={13} />
            <span>Decryption failed</span>
          </span>
        ) : (
          <div
            className="chat-message-content"
            dangerouslySetInnerHTML={{ __html: message.content }}
          />
        )}
      </div>

      <div className="flex items-center gap-1.5 px-1">
        <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
          {time}
        </span>
        {message.pending ? (
          <Clock size={10} className="text-[var(--text-muted)] animate-pulse" />
        ) : null}
      </div>
    </div>
  );
}
