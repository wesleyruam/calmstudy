"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { editorExtensions } from "@/components/rich-text-editor";
import type { TiptapDoc } from "@/lib/note-shared";

// Render read-only de uma nota Rich Text (para o caderno / revisão).
export function NoteRender({ content }: { content: TiptapDoc }) {
  const editor = useEditor({
    extensions: editorExtensions,
    editable: false,
    immediatelyRender: false,
    content: (content as object) ?? "",
    editorProps: { attributes: { class: "rte-content rte-static" } },
  });
  if (!editor) return null;
  return <EditorContent editor={editor} />;
}
