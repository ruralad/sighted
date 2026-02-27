"use client";

import { useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Placeholder from "@tiptap/extension-placeholder";
import { common, createLowlight } from "lowlight";
import { Send, Bold, Italic, Code, FileCode } from "lucide-react";

const lowlight = createLowlight(common);

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: "javascript",
      }),
      Placeholder.configure({
        placeholder: "Type a message…",
      }),
    ],
    editorProps: {
      attributes: {
        class: "chat-input-editor",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          handleSend();
          return true;
        }
        return false;
      },
    },
    immediatelyRender: false,
  });

  const handleSend = useCallback(() => {
    if (!editor || editor.isEmpty || disabled) return;

    const html = editor.getHTML();
    const text = editor.getText().trim();
    if (!text) return;

    onSend(html);
    editor.commands.clearContent();
  }, [editor, onSend, disabled]);

  if (!editor) return null;

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg-primary)]">
      <div className="flex items-center gap-0.5 px-3 pt-2 pb-1">
        <ToolbarBtn
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
          title="Bold"
        >
          <Bold size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
          title="Italic"
        >
          <Italic size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
          aria-label="Inline code"
          title="Inline Code"
        >
          <Code size={14} />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          aria-label="Code block"
          title="Code Block"
        >
          <FileCode size={14} />
        </ToolbarBtn>
      </div>

      <div className="flex items-end gap-2 px-3 pb-3">
        <div className="flex-1 min-w-0 max-h-[160px] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-[13px] text-[var(--text)] focus-within:border-[var(--accent)] transition-[border-color] duration-200">
          <EditorContent editor={editor} />
        </div>
        <button
          className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] bg-[var(--accent)] text-[var(--accent-text-on)] shrink-0 transition-[background-color,box-shadow] duration-200 ease-out hover:bg-[var(--accent-hover)] hover:shadow-[0_0_12px_var(--accent-glow)] disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleSend}
          disabled={disabled || !editor || editor.isEmpty}
          aria-label="Send message"
          title="Send"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

function ToolbarBtn({
  active,
  onClick,
  children,
  ...props
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] transition-[color,background-color] duration-150 ${
        active
          ? "bg-[var(--accent)] text-[var(--accent-text-on)]"
          : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)]"
      }`}
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
