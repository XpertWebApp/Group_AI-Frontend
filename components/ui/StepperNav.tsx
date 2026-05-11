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
  /** 0–1 progress of the current step (e.g. ratio of required fields filled). Defaults to 0. */
  stepProgress?: number;
}

export function StepperNav({ steps, currentStep, stepProgress = 0 }: StepperNavProps) {
  // Clamp to [0, 1] in case the caller passes something outside that range.
  const progress = Math.max(0, Math.min(1, stepProgress));

  return (
    <div className="w-full py-5 px-5 rounded-[14px] border border-sett-border-light bg-white">
      {/* Icons row */}
      <div className="grid grid-cols-4 gap-5">
        {steps.map((step, i) => {
          const isReached = i <= currentStep;
          const isActive = i === currentStep;
          return (
            <div
              key={`icon-${step.label}`}
              className="flex justify-start animate-sidebar-fade-up"
              style={{ animationDelay: `${80 + i * 70}ms` }}
            >
              <div
                className={cn(
                  'w-[40px] h-[40px] p-3 rounded-xl flex justify-center items-center shrink-0 overflow-hidden',
                  'transition-all duration-280 ease-sett-out',
                  isReached ? 'bg-sett-light-green-bg' : 'bg-[#f5f5f5] border border-[#C8C8C8]',
                  // The active step gets a subtle ring + lift to draw the eye
                  isActive && 'ring-2 ring-sett-primary/40 ring-offset-2 ring-offset-white scale-105 shadow-[0_4px_12px_0_rgba(170,199,55,0.25)]'
                )}
              >
                <Image
                  src={step.icon}
                  alt=""
                  width={16}
                  height={16}
                  className={cn(
                    'w-4 h-4 shrink-0 object-contain transition-all duration-280 ease-sett-out',
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

      {/* Progress bars row — past steps fill 100%, current step fills based on stepProgress */}
      <div className="grid grid-cols-4 gap-5 mt-[14px]">
        {steps.map((step, i) => {
          const isCompleted = i < currentStep;
          const isActive = i === currentStep;
          // Past steps full, current step partial (driven by progress), future steps empty
          const fillRatio = isCompleted ? 1 : isActive ? progress : 0;
          // Only show the leading-edge highlight on the active bar while it's filling
          // (between 5% and 95% — so it doesn't hover at the edges or look wrong at 100%).
          const showLeadingEdge = isActive && fillRatio > 0.05 && fillRatio < 0.99;

          return (
            <div
              key={`bar-${step.label}`}
              className="h-[10px] rounded-[4px] overflow-hidden bg-[#f0f0f0] relative animate-sidebar-fade-up"
              style={{ animationDelay: `${140 + i * 70}ms` }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(fillRatio * 100)}
              aria-label={`${step.label} progress`}
            >
              {/* Inner fill — width tracks fillRatio */}
              <div
                className="absolute inset-y-0 left-0 bg-sett-primary rounded-[4px] transition-[width] duration-420 ease-sett-out"
                style={{ width: `${fillRatio * 100}%` }}
              />
              {/* Leading edge — a brighter sliver at the right of the fill, gives the bar a sense of motion */}
              {showLeadingEdge && (
                <div
                  className="absolute inset-y-0 w-[6px] -ml-[6px] rounded-[4px] bg-sett-green-light shadow-[0_0_8px_2px_rgba(200,224,80,0.55)] transition-[left] duration-420 ease-sett-out"
                  style={{ left: `${fillRatio * 100}%` }}
                  aria-hidden
                />
              )}
            </div>
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
                'text-[12px] sm:text-[14px] leading-tight font-medium break-words min-w-0 pr-1 sm:pr-0 animate-sidebar-fade-up',
                'transition-colors duration-280 ease-sett-out',
                isActive
                  ? 'text-sett-text-secondary font-semibold'
                  : isCompleted
                    ? 'text-sett-text-primary'
                    : 'text-sett-text-accent'
              )}
              style={{ animationDelay: `${200 + i * 70}ms` }}
            >
              {step.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
