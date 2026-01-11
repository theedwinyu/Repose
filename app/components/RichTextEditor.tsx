'use client';

import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import EmojiPicker from 'emoji-picker-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const ToolbarButton = ({ 
  onClick, 
  isActive, 
  children, 
  disabled = false,
  title 
}: { 
  onClick: () => void; 
  isActive: boolean; 
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`
      min-w-[32px] h-8 px-2 rounded-lg transition-all duration-200 flex items-center justify-center
      ${isActive 
        ? 'bg-sage text-charcoal shadow-sm font-semibold' 
        : 'text-charcoal hover:bg-sage/10 bg-transparent'
      }
      ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105'}
    `}
  >
    {children}
  </button>
);

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [savedSelection, setSavedSelection] = useState<any>(null);

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
      handleKeyDown: (view, event) => {
        // Emoji picker shortcut (Cmd+E or Ctrl+E)
        if ((event.metaKey || event.ctrlKey) && event.key === 'e') {
          event.preventDefault();
          
          // Save current selection position
          const { state } = view;
          setSavedSelection({
            from: state.selection.from,
            to: state.selection.to,
          });
          
          setShowEmojiPicker(true);
          return true;
        }

        // Exit heading mode when pressing Enter
        if (event.key === 'Enter' && !event.shiftKey) {
          const { state } = view;
          const { $from } = state.selection;
          
          // Check if we're in a heading
          if ($from.parent.type.name.startsWith('heading')) {
            // Let TipTap create the new line, then convert it to paragraph
            setTimeout(() => {
              if (editor) {
                editor.chain().focus().setParagraph().run();
              }
            }, 0);
          }
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="serene-card rounded-xl p-8 animate-pulse">
        <div className="h-10 bg-sage/10 rounded mb-4"></div>
        <div className="h-64 bg-sage/10 rounded"></div>
      </div>
    );
  }

  return (
    <div className="serene-card rounded-xl overflow-visible relative">
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" transform="skewX(-10)" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M9 5h6m-6 14h6" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-6 bg-sage/20 mx-1" />

        {/* Headings + Normal Text */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          isActive={editor.isActive('paragraph')}
          title="Normal Text"
        >
          <span className="font-semibold text-sm text-current">P</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <span className="font-bold text-sm text-current">H1</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <span className="font-bold text-sm text-current">H2</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <span className="font-bold text-sm text-current">H3</span>
        </ToolbarButton>

        <div className="w-px h-6 bg-sage/20 mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="5" cy="6" r="2" />
            <circle cx="5" cy="12" r="2" />
            <circle cx="5" cy="18" r="2" />
            <line x1="10" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="10" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="10" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <span className="font-semibold text-sm text-current">1.</span>
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

        {/* Blocks */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
            onClick={() => {
              // Save current cursor position when clicking button too
              if (editor) {
                const { from, to } = editor.state.selection;
                setSavedSelection({ from, to });
              }
              setShowEmojiPicker(!showEmojiPicker);
            }}
            isActive={showEmojiPicker}
            title="Insert Emoji (⌘E)"
          >
            <span className="text-lg">😊</span>
          </ToolbarButton>
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

      {/* Editor */}
      <div className="p-6">
        <EditorContent editor={editor} />
      </div>

      {/* Emoji Picker Portal */}
      {showEmojiPicker && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[998]"
            onClick={() => setShowEmojiPicker(false)}
          />
          {/* Picker */}
          <div className="fixed z-[999] mt-2" style={{ top: '120px', left: '50%', transform: 'translateX(-50%)' }}>
            <EmojiPicker
              onEmojiClick={(emojiData) => {
                if (editor && savedSelection) {
                  // Insert emoji at saved cursor position without focusing (which would scroll)
                  editor
                    .chain()
                    .setTextSelection(savedSelection.from)
                    .insertContent(emojiData.emoji)
                    .run();
                } else if (editor) {
                  // Fallback: insert at current position
                  editor.chain().insertContent(emojiData.emoji).run();
                }
                setShowEmojiPicker(false);
                setSavedSelection(null);
              }}
              width={350}
              height={400}
              previewConfig={{ showPreview: false }}
            />
          </div>
        </>
      )}
    </div>
  );
}