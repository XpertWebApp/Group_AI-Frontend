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
    <div className="bg-sett-card rounded-card border border-sett-border p-6">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
        {steps.map((step, i) => {
          const isCompleted = i < currentStep;
          const isActive = i === currentStep;
          const isReached = isCompleted || isActive;
          return (
            <div key={step.label} className="flex flex-col items-start gap-3">
              {/* Step icon circle */}
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  isReached ? 'bg-sett-light-green-bg' : 'bg-[#f5f5f5]'
                )}
              >
                <Image
                  src={step.icon}
                  alt=""
                  width={18}
                  height={18}
                  className={cn(
                    isReached
                      ? 'brightness-0 invert-[45%] sepia-[90%] saturate-[400%] hue-rotate-[30deg]'
                      : 'opacity-40'
                  )}
                />
              </div>

              {/* Progress bar — thicker to match Figma */}
              <div
                className={cn(
                  'w-full h-[12px] rounded-full',
                  isReached ? 'bg-sett-primary' : 'bg-[#f0f0f0]'
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
