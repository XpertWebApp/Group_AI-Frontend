'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
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
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) {
      setValue('');
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-[448px] p-5 flex flex-col justify-center items-start gap-6 rounded-[14px] border-2 border-[#E6EAF0] bg-white shadow-[0_4px_10px_720px_rgba(0,0,0,0.60)]">
        <div>
          <h2 className="font-montserrat text-[18px] font-semibold leading-normal text-[#1D1D1D]">
            {title}
          </h2>
        </div>
        <div className="w-full">
          <label className="block font-montserrat text-[14px] font-medium leading-normal text-[#1D1D1D] uppercase mb-1.5">
            {label}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full p-3 rounded-[14px] border border-[#E6EAF0] bg-white font-montserrat text-[14px] font-normal leading-normal text-[#1D1D1D] placeholder:text-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#AAC737]"
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
        <div className="flex gap-3 w-full justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex py-3 px-4 justify-center items-center gap-1 rounded-[14px] border border-[#E6EAF0] bg-[#F7F7F7] font-montserrat text-[16px] font-semibold leading-normal text-[#4A4A4A]"
          >
            Cancel
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
            className="inline-flex py-3 px-4 justify-center items-center gap-1 rounded-[14px] bg-[#AAC737] shadow-[0_8px_20px_0_rgba(0,0,0,0.13),inset_4px_4px_5px_0_rgba(255,255,255,0.25)] font-montserrat text-[16px] font-semibold leading-normal text-white disabled:opacity-50"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
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
  const editorRef = useRef<HTMLDivElement>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const exec = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    editorRef.current?.focus();
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
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
    { icon: Bold, command: 'bold', title: 'Bold' },
    { icon: Italic, command: 'italic', title: 'Italic' },
    { icon: Underline, command: 'underline', title: 'Underline' },
    { icon: Strikethrough, command: 'strikeThrough', title: 'Strikethrough' },
    { type: 'separator' as const },
    { icon: AlignLeft, command: 'justifyLeft', title: 'Align Left' },
    { icon: AlignCenter, command: 'justifyCenter', title: 'Align Center' },
    { icon: AlignRight, command: 'justifyRight', title: 'Align Right' },
    { icon: AlignJustify, command: 'justifyFull', title: 'Justify' },
    { type: 'separator' as const },
    { icon: ListOrdered, command: 'insertOrderedList', title: 'Numbered List' },
    { icon: List, command: 'insertUnorderedList', title: 'Bullet List' },
    { type: 'separator' as const },
    { icon: ImageIcon, command: 'image', title: 'Insert Image' },
    { icon: LinkIcon, command: 'link', title: 'Insert Link' },
  ];

  return (
    <>
      <div className={cn('border border-[#E6EAF0] rounded-[14px] overflow-hidden', className)}>
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-[#E6EAF0] bg-[#F7F7F7]">
          {toolbarButtons.map((btn, i) => {
            if ('type' in btn && btn.type === 'separator') {
              return <span key={`sep-${i}`} className="w-px h-5 bg-[#E6EAF0] mx-1" />;
            }
            const Icon = btn.icon!;
            const handleClick = () => {
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
                onClick={handleClick}
                title={btn.title}
                className="w-8 h-8 flex items-center justify-center rounded-md text-[#4A4A4A] hover:bg-[#E6EAF0] transition-colors"
              >
                <Icon className="w-[18px] h-[18px]" />
              </button>
            );
          })}
        </div>

        {/* Editable Area */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          dangerouslySetInnerHTML={{ __html: value }}
          className="w-full px-4 py-3 font-montserrat text-[14px] font-normal leading-normal text-[#1D1D1D] focus:outline-none bg-white overflow-y-auto"
          style={{ minHeight }}
        />
      </div>

      {/* Link Modal */}
      <InsertModal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onConfirm={handleInsertLink}
        title="Insert Link"
        label="URL"
        placeholder="https://example.com"
      />

      {/* Image Modal */}
      <InsertModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onConfirm={handleInsertImage}
        title="Insert Image"
        label="Image URL"
        placeholder="https://example.com/image.png"
      />
    </>
  );
}
