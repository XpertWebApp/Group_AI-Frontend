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
    <div className="w-full flex justify-center items-center py-5 pl-5 pr-[22px] rounded-[14px] border border-[#E6EAF0] bg-white">
      <div className="flex items-center gap-5 w-full">
        {steps.map((step, i) => {
          const isCompleted = i < currentStep;
          const isActive = i === currentStep;
          const isReached = isCompleted || isActive;
          return (
            <div key={step.label} className="flex flex-1 flex-col items-start gap-[14px]">
              {/* Step icon circle */}
              <div
                className={cn(
                  'w-[40px] h-[40px] p-3 rounded-xl flex justify-center items-center aspect-square overflow-hidden',
                  isReached ? 'bg-sett-light-green-bg' : 'bg-[#f5f5f5] border border-[#C8C8C8]'
                )}
              >
                <Image
                  src={step.icon}
                  alt=""
                  width={16}
                  height={16}
                  className={cn(
                    'w-4 h-4 shrink-0 aspect-square object-contain',
                    isReached
                      ? 'brightness-0 invert-[45%] sepia-[90%] saturate-[400%] hue-rotate-[30deg]'
                      : ''
                  )}
                />
              </div>

              {/* Progress bar — thicker to match Figma */}
              <div
                className={cn(
                  'w-full h-[10px] rounded-[4px]',
                  isReached ? 'bg-[#AAC737]' : 'bg-[#f0f0f0]'
                )}
              />

              {/* Step label */}
              <span
                className={cn(
                  'text-body font-medium',
                  isActive
                    ? 'text-sett-text-secondary'
                    : isCompleted
                      ? 'text-sett-text-primary'
                      : 'text-sett-text-accent'
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
