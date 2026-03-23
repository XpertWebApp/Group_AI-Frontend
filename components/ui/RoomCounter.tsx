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
    <div className="border border-[#E6EAF0] rounded-[14px] bg-white py-5 px-4 flex flex-col items-center gap-[14px]">
      <span className="font-montserrat text-[14px] font-medium leading-normal text-[#1D1D1D] uppercase text-center">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value === 0}
          className={cn(
            'w-7 h-7 rounded-[14px] flex items-center justify-center border-[0.8px] border-[#AAC737] transition-colors',
            value === 0
              ? 'opacity-40 cursor-not-allowed'
              : 'text-[#AAC737] hover:bg-[#F7FAEB]'
          )}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="font-montserrat text-[18px] font-bold text-[#1D1D1D] w-6 text-center">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-7 h-7 rounded-[14px] flex items-center justify-center bg-[#AAC737] border-[0.8px] border-[#AAC737] text-white shadow-[0_8px_20px_0_rgba(0,0,0,0.13),inset_4px_4px_5px_0_rgba(255,255,255,0.25)] hover:bg-[#99B530] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
