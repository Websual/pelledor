"use client";

import { useCallback, useMemo, useRef } from "react";
import { EditorProvider, useCurrentEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Heading } from "@tiptap/extension-heading";
import { Type, Bold as BoldIcon, Italic as ItalicIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const extensions = [
  StarterKit.configure({
    heading: false,
    blockquote: false,
    code: false,
    codeBlock: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    listKeymap: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    link: false,
  }),
  Heading.configure({ levels: [3] }),
  Placeholder.configure({
    placeholder: "Décrivez votre approche...",
  }),
];

function Toolbar() {
  const { editor } = useCurrentEditor();
  if (!editor) return null;

  const isBold = editor.isActive("bold");
  const isItalic = editor.isActive("italic");
  const isH3 = editor.isActive("heading", { level: 3 });

  return (
    <div className="flex items-center gap-0.5 border-b border-sable/80 bg-blanc-casse/50 px-2 py-1.5 rounded-t-3xl">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(
          "p-2 rounded-2xl transition-colors",
          isBold ? "bg-sauge/15 text-sauge" : "text-anthracite/70 hover:bg-sable/60 hover:text-anthracite"
        )}
        title="Gras"
        aria-pressed={isBold}
      >
        <BoldIcon className="h-4 w-4" strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(
          "p-2 rounded-2xl transition-colors",
          isItalic ? "bg-sauge/15 text-sauge" : "text-anthracite/70 hover:bg-sable/60 hover:text-anthracite"
        )}
        title="Italique"
        aria-pressed={isItalic}
      >
        <ItalicIcon className="h-4 w-4" strokeWidth={2.5} />
      </button>
      <span className="w-px h-5 bg-sable mx-0.5" aria-hidden />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={cn(
          "p-2 rounded-2xl transition-colors flex items-center gap-1",
          isH3 ? "bg-sauge/15 text-sauge" : "text-anthracite/70 hover:bg-sable/60 hover:text-anthracite"
        )}
        title="Titre (H3)"
        aria-pressed={isH3}
      >
        <Type className="h-4 w-4" strokeWidth={2.5} />
        <span className="text-xs font-medium">H3</span>
      </button>
    </div>
  );
}

const editorContentClass = cn(
  "prose prose-sm max-w-none min-h-[140px] px-4 py-3 rounded-b-3xl",
  "focus:outline-none",
  "prose-headings:font-heading prose-headings:font-semibold prose-headings:text-anthracite",
  "prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2",
  "prose-p:my-2 prose-p:text-anthracite/90",
  "prose-ul:my-2 prose-ul:pl-5 prose-ul:list-disc",
  "prose-ol:my-2 prose-ol:pl-5 prose-ol:list-decimal",
  "[&_.is-empty.is-editor-empty]:before:content-[attr(data-placeholder)] [&_.is-empty.is-editor-empty]:before:text-anthracite/45 [&_.is-empty.is-editor-empty]:before:italic",
  "[&_.is-empty]:before:content-[attr(data-placeholder)] [&_.is-empty]:before:text-anthracite/45 [&_.is-empty]:before:italic"
);

export interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichEditor({ value, onChange, placeholder, className }: RichEditorProps) {
  const lastHtmlRef = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleUpdate = useCallback(({ editor }: { editor: { getHTML: () => string } }) => {
    const html = editor.getHTML();
    if (html !== lastHtmlRef.current) {
      lastHtmlRef.current = html;
      onChangeRef.current(html);
    }
  }, []);

  const extensionsWithPlaceholder = useMemo(() => {
    if (placeholder !== undefined) {
      return [
        ...extensions.filter((e) => e.name !== "placeholder"),
        Placeholder.configure({ placeholder }),
      ];
    }
    return extensions;
  }, [placeholder]);

  // Normalise le texte brut (bios existantes sans HTML) en un paragraphe valide pour Tiptap
  const editorContent = useMemo(() => {
    const v = value ?? "";
    if (!v.trim()) return v;
    if (/<\s*[a-zA-Z]/.test(v)) return v;
    return `<p>${v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")}</p>`;
  }, [value]);

  return (
    <div className={cn("rounded-3xl border border-sable/60 bg-white overflow-hidden", className)}>
      <EditorProvider
        extensions={extensionsWithPlaceholder}
        content={editorContent}
        onUpdate={handleUpdate}
        editorProps={{
          attributes: {
            class: editorContentClass,
          },
        }}
        slotBefore={<Toolbar />}
      />
    </div>
  );
}
