'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

// Move ToolbarButton outside component to fix React hooks rules
const ToolbarButton = ({
  onClick,
  isActive,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  isActive: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    type="button"
    disabled={disabled}
    title={title}
    className={`p-2.5 rounded-lg transition-all duration-200 ${
      isActive 
        ? 'bg-sage/15 text-charcoal' 
        : 'text-warm-gray hover:bg-sage/8 hover:text-charcoal'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [isClient, setIsClient] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsClient(true);
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Begin writing your thoughts...',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-serene max-w-none min-h-[300px] focus:outline-none px-2 py-1',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const insertEmoji = (emoji: string) => {
    if (editor) {
      editor.chain().focus().insertContent(emoji).run();
      setShowEmojiPicker(false);
    }
  };

  const commonEmojis = [
    '😊', '😌', '😔', '😢', '😐', '❤️', '🙏', '✨', '🌟', '💭',
    '🎉', '😄', '😅', '😂', '🥰', '😍', '🤔', '😎', '🌈', '🌸',
    '🌺', '🌻', '🌷', '🌹', '🍀', '🌿', '🌊', '⭐', '💫', '✅',
  ];

  if (!isClient) {
    return (
      <div className="serene-card rounded-xl p-4">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 spinner-serene rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!editor) {
    return (
      <div className="serene-card rounded-xl p-4">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 spinner-serene rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="serene-card rounded-xl overflow-hidden relative">
      {/* Toolbar */}
      <div className="border-b border-sage/10 p-3 flex items-center gap-1 flex-wrap bg-light-gray/30">
        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Cmd+B)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12h8a4 4 0 000-8H6v8zm0 0h9a4 4 0 010 8H6v-8z" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Cmd+I)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4M10 20h4M14 4l-4 16" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M9 5h6M9 19h6" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-6 bg-sage/20 mx-1" />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <span className="font-bold text-base">H1</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <span className="font-bold text-sm">H2</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <span className="font-bold text-xs">H3</span>
        </ToolbarButton>

        <div className="w-px h-6 bg-sage/20 mx-1" />

        {/* Lists - Fixed Icons */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <line x1="8" y1="6" x2="21" y2="6" strokeWidth="2" strokeLinecap="round" />
            <line x1="8" y1="12" x2="21" y2="12" strokeWidth="2" strokeLinecap="round" />
            <line x1="8" y1="18" x2="21" y2="18" strokeWidth="2" strokeLinecap="round" />
            <circle cx="4" cy="6" r="1" fill="currentColor" />
            <circle cx="4" cy="12" r="1" fill="currentColor" />
            <circle cx="4" cy="18" r="1" fill="currentColor" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <span className="font-semibold text-sm">1.</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive('taskList')}
          title="Task List (Checkboxes)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="4" width="3" height="3" rx="0.5" strokeWidth="1.5" />
            <rect x="3" y="10.5" width="3" height="3" rx="0.5" strokeWidth="1.5" />
            <rect x="3" y="17" width="3" height="3" rx="0.5" strokeWidth="1.5" />
            <line x1="9" y1="5.5" x2="21" y2="5.5" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9" y1="12" x2="21" y2="12" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9" y1="18.5" x2="21" y2="18.5" strokeWidth="1.5" strokeLinecap="round" />
            <polyline points="3.5,5 4.5,6 5.5,4.5" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-6 bg-sage/20 mx-1" />

        {/* Block Elements */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9h8M8 13h6M9 17h4" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 9v8" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          isActive={false}
          title="Horizontal Line"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <line x1="4" y1="12" x2="20" y2="12" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-6 bg-sage/20 mx-1" />

        {/* Emoji Picker */}
        <div className="relative">
          <ToolbarButton
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            isActive={showEmojiPicker}
            title="Insert Emoji"
          >
            <span className="text-lg">😊</span>
          </ToolbarButton>

          {showEmojiPicker && (
            <div className="absolute top-full left-0 mt-2 bg-soft-white border border-sage/20 rounded-xl shadow-serene-lg p-3 z-50 grid grid-cols-10 gap-1 w-80">
              {commonEmojis.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="w-7 h-7 flex items-center justify-center hover:bg-sage/10 rounded transition-colors text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-sage/20 mx-1" />

        {/* Actions */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setHardBreak().run()}
          isActive={false}
          title="Line Break (Shift+Enter)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          isActive={false}
          title="Clear Formatting"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-6 bg-sage/20 mx-1" />

        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          isActive={false}
          disabled={!editor.can().undo()}
          title="Undo (Cmd+Z)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          isActive={false}
          disabled={!editor.can().redo()}
          title="Redo (Cmd+Shift+Z)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <div className="p-6 bg-cream">
        <EditorContent editor={editor} />
      </div>

      {/* Click outside to close emoji picker */}
      {showEmojiPicker && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowEmojiPicker(false)}
        />
      )}
    </div>
  );
}