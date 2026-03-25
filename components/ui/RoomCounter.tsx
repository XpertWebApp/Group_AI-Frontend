'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface RoomCounterProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
}

export function RoomCounter({ label, value, onChange, max }: RoomCounterProps) {
  const isMaxReached = max !== undefined && value >= max;
  return (
    <div className="border border-sett-border-light rounded-[14px] bg-white py-5 px-4 flex flex-col items-center gap-[14px]">
      <span className="font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase text-center">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value === 0}
          className={cn(
            'w-7 h-7 rounded-[14px] flex items-center justify-center border-[0.8px] border-sett-primary transition-colors',
            value === 0
              ? 'opacity-40 cursor-not-allowed'
              : 'text-sett-primary hover:bg-sett-light-green-bg'
          )}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="font-montserrat text-[18px] font-bold text-sett-text-primary w-6 text-center">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={isMaxReached}
          className={cn(
            'w-7 h-7 rounded-[14px] flex items-center justify-center border-[0.8px] border-sett-primary transition-colors',
            isMaxReached
              ? 'opacity-40 cursor-not-allowed bg-sett-primary text-white'
              : 'bg-sett-primary text-white shadow-[0_8px_20px_0_rgba(0,0,0,0.13),inset_4px_4px_5px_0_rgba(255,255,255,0.25)] hover:bg-sett-primary-hover'
          )}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
