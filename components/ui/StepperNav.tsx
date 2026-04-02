'use client';

import { cn } from '@/lib/utils/cn';
import Image from 'next/image';

interface Step {
  label: string;
  icon: string;
}

interface StepperNavProps {
  steps: Step[];
  currentStep: number;
}

export function StepperNav({ steps, currentStep }: StepperNavProps) {
  return (
    <div className="w-full py-5 px-5 rounded-[14px] border border-sett-border-light bg-white">
      {/* Icons row */}
      <div className="grid grid-cols-4 gap-5">
        {steps.map((step, i) => {
          const isReached = i <= currentStep;
          return (
            <div key={`icon-${step.label}`} className="flex justify-start">
              <div
                className={cn(
                  'w-[40px] h-[40px] p-3 rounded-xl flex justify-center items-center shrink-0 overflow-hidden',
                  isReached ? 'bg-sett-light-green-bg' : 'bg-[#f5f5f5] border border-[#C8C8C8]'
                )}
              >
                <Image
                  src={step.icon}
                  alt=""
                  width={16}
                  height={16}
                  className={cn(
                    'w-4 h-4 shrink-0 object-contain',
                    isReached
                      ? 'brightness-0 invert-[45%] sepia-[90%] saturate-[400%] hue-rotate-[30deg]'
                      : ''
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bars row */}
      <div className="grid grid-cols-4 gap-5 mt-[14px]">
        {steps.map((step, i) => {
          const isReached = i <= currentStep;
          return (
            <div
              key={`bar-${step.label}`}
              className={cn(
                'h-[10px] rounded-[4px]',
                isReached ? 'bg-sett-primary' : 'bg-[#f0f0f0]'
              )}
            />
          );
        })}
      </div>

      {/* Labels row */}
      <div className="grid grid-cols-4 gap-5 mt-[14px]">
        {steps.map((step, i) => {
          const isCompleted = i < currentStep;
          const isActive = i === currentStep;
          return (
            <span
              key={`label-${step.label}`}
              className={cn(
                'text-[12px] sm:text-[14px] leading-tight font-medium break-words min-w-0 pr-1 sm:pr-0',
                isActive
                  ? 'text-sett-text-secondary'
                  : isCompleted
                    ? 'text-sett-text-primary'
                    : 'text-sett-text-accent'
              )}
            >
              {step.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
