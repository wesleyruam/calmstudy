"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import {
  Heading1,
  Heading2,
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  SquareCode,
  Link as LinkIcon,
  Table as TableIcon,
  Image as ImageIcon,
} from "lucide-react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useDialog, type DialogApi } from "@/components/dialog-provider";
import type { TiptapDoc } from "@/lib/note-shared";

// Extensões compartilhadas entre o editor e o render read-only do caderno.
export const editorExtensions = [
  StarterKit,
  TaskList,
  TaskItem.configure({ nested: true }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  Image,
  Placeholder.configure({ placeholder: "Escreva sua nota…" }),
];

export function RichTextEditor({
  initialContent,
  onChange,
}: {
  initialContent: TiptapDoc;
  onChange: (doc: TiptapDoc, text: string) => void;
}) {
  const editor = useEditor({
    extensions: editorExtensions,
    // Next: evita mismatch de hidratação renderizando só no cliente.
    immediatelyRender: false,
    content: hasContent(initialContent) ? (initialContent as object) : "",
    editorProps: {
      attributes: { class: "rte-content focus:outline-none" },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON() as TiptapDoc, editor.getText());
    },
  });

  if (!editor) {
    return <div className="h-24 animate-pulse rounded-lg bg-[var(--color-line)]/40" />;
  }

  return (
    <div className="rounded-lg border border-[var(--color-line)]">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

// Um doc TipTap "vazio" ({} ou sem content) não deve ser passado como content.
function hasContent(doc: TiptapDoc): boolean {
  return (
    typeof doc === "object" &&
    doc !== null &&
    "type" in doc &&
    Array.isArray((doc as { content?: unknown[] }).content) &&
    ((doc as { content: unknown[] }).content.length > 0)
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const dialog = useDialog();
  const btn = (active: boolean) =>
    [
      "grid size-7 place-items-center rounded text-xs transition-colors",
      active
        ? "bg-[var(--color-accent-soft)] text-[var(--color-ink)]"
        : "text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]/60",
    ].join(" ");

  const ico = "size-4";
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--color-line)] p-1">
      <button
        className={btn(editor.isActive("heading", { level: 1 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Título"
      >
        <Heading1 className={ico} />
      </button>
      <button
        className={btn(editor.isActive("heading", { level: 2 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Subtítulo"
      >
        <Heading2 className={ico} />
      </button>
      <Sep />
      <button
        className={btn(editor.isActive("bold"))}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Negrito"
      >
        <Bold className={ico} />
      </button>
      <button
        className={btn(editor.isActive("italic"))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Itálico"
      >
        <Italic className={ico} />
      </button>
      <button
        className={btn(editor.isActive("code"))}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Código inline"
      >
        <Code className={ico} />
      </button>
      <Sep />
      <button
        className={btn(editor.isActive("bulletList"))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Lista"
      >
        <List className={ico} />
      </button>
      <button
        className={btn(editor.isActive("orderedList"))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Lista numerada"
      >
        <ListOrdered className={ico} />
      </button>
      <button
        className={btn(editor.isActive("taskList"))}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Checklist"
      >
        <ListChecks className={ico} />
      </button>
      <Sep />
      <button
        className={btn(editor.isActive("blockquote"))}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Citação"
      >
        <Quote className={ico} />
      </button>
      <button
        className={btn(editor.isActive("codeBlock"))}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Bloco de código"
      >
        <SquareCode className={ico} />
      </button>
      <button
        className={btn(editor.isActive("link"))}
        onClick={() => void setLink(editor, dialog)}
        title="Link"
      >
        <LinkIcon className={ico} />
      </button>
      <button
        className={btn(false)}
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        title="Tabela"
      >
        <TableIcon className={ico} />
      </button>
      <button className={btn(false)} onClick={() => void addImage(editor, dialog)} title="Imagem">
        <ImageIcon className={ico} />
      </button>
    </div>
  );
}

function Sep() {
  return <span className="mx-0.5 h-4 w-px bg-[var(--color-line)]" />;
}

async function setLink(editor: Editor, dialog: DialogApi) {
  const prev = editor.getAttributes("link").href as string | undefined;
  const url = await dialog.prompt({
    title: "Inserir link",
    label: "URL (deixe vazio para remover)",
    placeholder: "https://",
    defaultValue: prev ?? "https://",
    confirmLabel: "Aplicar",
    allowEmpty: true,
  });
  if (url === null) return;
  if (url === "") {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
}

async function addImage(editor: Editor, dialog: DialogApi) {
  const url = await dialog.prompt({
    title: "Inserir imagem",
    label: "URL da imagem",
    placeholder: "https://…",
    confirmLabel: "Inserir",
  });
  if (url) editor.chain().focus().setImage({ src: url }).run();
}
