'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface RoomCounterProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function RoomCounter({ label, value, onChange }: RoomCounterProps) {
  return (
    <div className="border border-sett-border rounded-card p-4 flex flex-col items-center gap-2">
      <span className="text-label text-sett-text-accent uppercase tracking-wide">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value === 0}
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center border transition-colors',
            value === 0
              ? 'border-sett-border text-sett-text-accent cursor-not-allowed'
              : 'border-sett-primary text-sett-primary hover:bg-sett-light-green-bg'
          )}
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-heading-sm font-bold text-sett-text-primary w-6 text-center">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-sett-primary text-white hover:bg-sett-primary-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
