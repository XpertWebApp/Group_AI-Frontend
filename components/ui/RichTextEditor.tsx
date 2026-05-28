'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { ModalOverlay } from './ModalOverlay';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ListOrdered,
  List,
  Image as ImageIcon,
  Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useLanguage } from '@/lib/i18n/LanguageContext';

/* ─── Insert Modal ─── */
function InsertModal({
  open,
  onClose,
  onConfirm,
  title,
  label,
  placeholder,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  label: string;
  placeholder: string;
}) {
  const { t } = useLanguage();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) setValue('');
  }, [open]);

  return (
    <ModalOverlay open={open} onClose={onClose} className="p-4">
      {/* §5.3 panel + §5.1 buttons + §5.5 inputs. */}
      <div
        className="w-[448px] bg-white overflow-hidden flex flex-col"
        style={{
          borderRadius: 8,
          border: '1px solid #E0E0E0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <div aria-hidden className="h-[3px] w-full bg-sett-primary" />
        <div className="px-5 py-5 flex flex-col gap-5">
          <h2 className="font-montserrat text-[18px] font-bold leading-tight text-sett-navy">
            {title}
          </h2>
          <div className="w-full">
            <label className="block font-montserrat text-[12px] font-semibold leading-none uppercase tracking-[0.05em] text-sett-navy mb-1.5">
              {label}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="w-full h-[41px] px-3 py-2 rounded-[4px] border border-[#D0D0D0] bg-white font-montserrat text-[14px] font-normal leading-none text-sett-navy placeholder:text-sett-grey focus:outline-none focus:border-sett-primary focus:shadow-[0_0_0_3px_rgba(170,199,55,0.15)] transition-[border-color,box-shadow] duration-150"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && value.trim()) {
                  onConfirm(value.trim());
                  onClose();
                }
                if (e.key === 'Escape') onClose();
              }}
            />
          </div>
        </div>
        <div className="h-px bg-[#E0E0E0] mx-5" />
        <div className="flex gap-3 px-5 py-4 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-[41px] px-6 rounded-[4px] border-2 border-sett-primary bg-transparent font-montserrat text-[14px] font-bold leading-none uppercase tracking-[0.08em] text-sett-primary hover:bg-sett-primary/5 active:scale-[0.98] transition-colors duration-200"
          >
            {t.richText.cancel}
          </button>
          <button
            type="button"
            onClick={() => {
              if (value.trim()) {
                onConfirm(value.trim());
                onClose();
              }
            }}
            disabled={!value.trim()}
            className="inline-flex items-center justify-center h-[41px] px-6 rounded-[4px] bg-sett-primary hover:bg-sett-green-dark font-montserrat text-[14px] font-bold leading-none uppercase tracking-[0.08em] text-sett-navy active:scale-[0.98] transition-colors duration-200 disabled:opacity-60"
          >
            {t.richText.insert}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

/* ─── Rich Text Editor ─── */
interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  minHeight?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  minHeight = '160px',
  className,
}: RichTextEditorProps) {
  const { t } = useLanguage();
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  // Cached caret/selection inside the contenteditable, captured whenever the
  // user makes a selection there. We restore it just before running execCommand
  // because the browser drops the selection the moment focus moves to a
  // toolbar button — even with preventDefault, the contenteditable can lose
  // its active range on some browsers, which makes list/format commands no-op.
  const savedRangeRef = useRef<Range | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  // Sync value into the editor only on mount or when value changes externally
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // Cache the current selection range whenever it lives inside our editor.
  // Captured on selectionchange while the editor is focused so we can replay
  // the same range right before exec() — guarantees execCommand has a live
  // selection to operate on.
  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const editor = editorRef.current;
      if (editor && editor.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    };
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const exec = useCallback((command: string, val?: string) => {
    // Re-focus the editor and restore the saved range so execCommand has a
    // live selection to operate on — without this, list/alignment commands
    // silently no-op after the click moves focus away from the contenteditable.
    const editor = editorRef.current;
    if (editor) editor.focus();
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }
    document.execCommand(command, false, val);
    if (editor) {
      isInternalChange.current = true;
      onChange(editor.innerHTML);
    }
    editor?.focus();
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInsertLink = useCallback((url: string) => {
    editorRef.current?.focus();
    exec('createLink', url);
  }, [exec]);

  const handleInsertImage = useCallback((url: string) => {
    editorRef.current?.focus();
    exec('insertImage', url);
  }, [exec]);

  const toolbarButtons = [
    { icon: Bold, command: 'bold', title: t.richText.bold },
    { icon: Italic, command: 'italic', title: t.richText.italic },
    { icon: Underline, command: 'underline', title: t.richText.underline },
    { icon: Strikethrough, command: 'strikeThrough', title: t.richText.strikethrough },
    { type: 'separator' as const },
    { icon: AlignLeft, command: 'justifyLeft', title: t.richText.alignLeft },
    { icon: AlignCenter, command: 'justifyCenter', title: t.richText.alignCenter },
    { icon: AlignRight, command: 'justifyRight', title: t.richText.alignRight },
    { icon: AlignJustify, command: 'justifyFull', title: t.richText.justify },
    { type: 'separator' as const },
    { icon: ListOrdered, command: 'insertOrderedList', title: t.richText.numberedList },
    { icon: List, command: 'insertUnorderedList', title: t.richText.bulletList },
    { type: 'separator' as const },
    { icon: ImageIcon, command: 'image', title: t.richText.insertImage },
    { icon: LinkIcon, command: 'link', title: t.richText.insertLink },
  ];

  return (
    <>
      <div className={cn('border border-sett-border-light rounded-[14px] overflow-hidden', className)}>
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-sett-border-light bg-[#F7F7F7]">
          {toolbarButtons.map((btn, i) => {
            if ('type' in btn && btn.type === 'separator') {
              return <span key={`sep-${i}`} className="w-px h-5 bg-sett-border-light mx-1" />;
            }
            const Icon = btn.icon!;
            // Buttons must use onMouseDown + preventDefault so the click never
            // steals focus from the contentEditable. Without this the
            // selection is lost before document.execCommand fires, which is
            // why insertOrderedList / insertUnorderedList (and any other
            // selection-dependent commands) were doing nothing.
            const handleMouseDown = (e: React.MouseEvent) => {
              e.preventDefault();
              if (btn.command === 'link') {
                setLinkModalOpen(true);
              } else if (btn.command === 'image') {
                setImageModalOpen(true);
              } else {
                exec(btn.command!);
              }
            };
            return (
              <button
                key={btn.command}
                type="button"
                onMouseDown={handleMouseDown}
                title={btn.title}
                className="w-8 h-8 flex items-center justify-center rounded-md text-sett-text-secondary hover:bg-sett-border-light transition-colors"
              >
                <Icon className="w-[18px] h-[18px]" />
              </button>
            );
          })}
        </div>

        {/* Editable Area — `sett-rich-editor` class gives us a scoped hook in
            globals.css to restore <ul>/<ol> markers that Tailwind's preflight
            strips. Without it, execCommand toggles the list element correctly
            but the bullets / numbers are invisible. */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          className="sett-rich-editor w-full px-4 py-3 font-montserrat text-[14px] font-normal leading-normal text-sett-text-primary focus:outline-none bg-white overflow-y-auto"
          style={{ minHeight, direction: 'ltr', textAlign: 'left' }}
        />
      </div>

      {/* Link Modal */}
      <InsertModal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onConfirm={handleInsertLink}
        title={t.richText.insertLink}
        label={t.richText.url}
        placeholder="https://example.com"
      />

      {/* Image Modal */}
      <InsertModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onConfirm={handleInsertImage}
        title={t.richText.insertImage}
        label={t.richText.imageUrl}
        placeholder="https://example.com/image.png"
      />
    </>
  );
}
