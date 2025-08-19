import React from "react";
import { cn } from "@/lib/utils";

interface StepProgressProps {
  currentStep: number;
  className?: string;
}

const steps = [
  { id: 1, label: "Category" },
  { id: 2, label: "Text" },
  { id: 3, label: "Visual" },
  { id: 4, label: "Finish" }
];

export const StepProgress: React.FC<StepProgressProps> = ({ currentStep, className }) => {
  return (
    <div className={cn("w-full max-w-2xl mx-auto px-4 py-8", className)}>
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-muted -translate-y-1/2">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
        
        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step) => {
            const isActive = currentStep >= step.id;
            const isCurrent = currentStep === step.id;
            
            return (
              <div key={step.id} className="flex flex-col items-center">
                {/* Step Circle */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-muted",
                    isCurrent && "ring-2 ring-primary/20 ring-offset-2"
                  )}
                >
                  {isActive ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                
                {/* Step Label */}
                <span
                  className={cn(
                    "mt-2 text-sm font-medium transition-colors duration-300",
                    isActive ? "text-foreground" : "text-muted-foreground",
                    "hidden sm:block"
                  )}
                >
                  {step.label}
                </span>
                
                {/* Mobile Label - Show only current step */}
                <span
                  className={cn(
                    "mt-2 text-sm font-medium transition-colors duration-300",
                    isCurrent ? "text-foreground" : "text-transparent",
                    "sm:hidden"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};