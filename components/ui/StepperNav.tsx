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
          return (
            <div key={step.label} className="flex flex-col items-start gap-2">
              <div
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center',
                  isCompleted || isActive
                    ? 'bg-sett-light-green-bg'
                    : 'bg-sett-fill'
                )}
              >
                <Image src={step.icon} alt="" width={16} height={16} />
              </div>
              <div
                className={cn(
                  'w-full h-1 rounded-full',
                  isCompleted || isActive ? 'bg-sett-primary' : 'bg-sett-fill'
                )}
              />
              <span
                className={cn(
                  'text-body font-medium',
                  isActive ? 'text-sett-text-secondary' : 'text-sett-text-accent'
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
