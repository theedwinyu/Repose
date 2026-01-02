'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const editor = useEditor({
    extensions: [StarterKit],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[300px] focus:outline-none',
      },
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!isClient) {
    return (
      <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-zinc-700 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!editor) {
    return (
      <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-zinc-700 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
  }: {
    onClick: () => void;
    isActive: boolean;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      type="button"
      className={`p-2 rounded transition-colors ${
        isActive ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl overflow-hidden backdrop-blur-sm">
      {/* Toolbar */}
      <div className="border-b border-zinc-700/50 p-2 flex items-center gap-1 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <line x1="19" y1="4" x2="10" y2="4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            <line x1="14" y1="20" x2="5" y2="20" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            <line x1="15" y1="4" x2="9" y2="20" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M8 5h8M9 19h6" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-6 bg-zinc-700 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
        >
          <span className="font-bold text-sm">H</span>
        </ToolbarButton>

        <div className="w-px h-6 bg-zinc-700 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <line x1="8" y1="6" x2="21" y2="6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            <line x1="8" y1="12" x2="21" y2="12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            <line x1="8" y1="18" x2="21" y2="18" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            <circle cx="4" cy="6" r="1" fill="currentColor" />
            <circle cx="4" cy="12" r="1" fill="currentColor" />
            <circle cx="4" cy="18" r="1" fill="currentColor" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <line x1="10" y1="6" x2="21" y2="6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            <line x1="10" y1="12" x2="21" y2="12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            <line x1="10" y1="18" x2="21" y2="18" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            <path d="M4 6h1v4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            <path d="M4 10h2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9h8M8 13h6m-10 8h16a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-6 bg-zinc-700 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          isActive={false}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          isActive={false}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <div className="p-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}