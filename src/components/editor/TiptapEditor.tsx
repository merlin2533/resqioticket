"use client";

import { useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";

interface TiptapEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  ticketId?: string;
  apiKey?: string;
  minHeight?: string;
}

function ToolbarButton({
  onClick, active, title, children,
}: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded text-sm font-medium transition-colors ${
        active ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

export function TiptapEditor({
  content = "",
  onChange,
  placeholder = "Schreiben…",
  editable = true,
  ticketId,
  apiKey,
  minHeight = "120px",
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ inline: true, allowBase64: false }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Update content when prop changes (e.g. template applied)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Image paste handler
  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      if (!editor || !ticketId || !apiKey) return;
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find((i) => i.type.startsWith("image/"));
      if (!imageItem) return;

      e.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;

      // Show placeholder
      const pos = editor.state.selection.from;
      editor.chain().focus().insertContentAt(pos, "<p>⏳ Bild wird hochgeladen…</p>").run();

      try {
        const formData = new FormData();
        formData.append("file", file, `paste-${Date.now()}.${file.type.split("/")[1]}`);
        formData.append("ticketId", ticketId);

        const res = await fetch("/api/attachments/upload", {
          method: "POST",
          headers: { "x-api-key": apiKey },
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");
        const { data } = await res.json();

        // Replace placeholder with actual image
        editor.chain().focus().run();
        editor.commands.insertContent(`<img src="${data.driveUrl}" alt="${data.filename}" />`);
      } catch {
        editor.commands.insertContent("<p><em>Bild-Upload fehlgeschlagen</em></p>");
      }
    },
    [editor, ticketId, apiKey]
  );

  useEffect(() => {
    const el = editor?.view?.dom;
    if (!el) return;
    el.addEventListener("paste", handlePaste as unknown as EventListener);
    return () => el.removeEventListener("paste", handlePaste as unknown as EventListener);
  }, [editor, handlePaste]);

  if (!editor) return null;

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Fett (Ctrl+B)">
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Kursiv (Ctrl+I)">
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Code">
            {"</>"}
          </ToolbarButton>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Überschrift">
            H2
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Aufzählung">
            ≡
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Nummerierte Liste">
            1.
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="Todo-Liste">
            ☑
          </ToolbarButton>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code-Block">
            {"{ }"}
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Zitat">
            &ldquo;
          </ToolbarButton>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Rückgängig">↩</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Wiederholen">↪</ToolbarButton>
          {ticketId && apiKey && (
            <>
              <div className="w-px h-5 bg-gray-300 mx-1" />
              <span className="text-xs text-gray-400 px-1">📎 Bild einfach einkopieren</span>
            </>
          )}
        </div>
      )}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-3 py-2 focus:outline-none"
        style={{ minHeight }}
      />
    </div>
  );
}
