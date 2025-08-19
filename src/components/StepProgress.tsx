import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepProgressProps {
  currentStep: number;
}

const steps = [
  { id: 1, name: "Category" },
  { id: 2, name: "Text" },
  { id: 3, name: "Visual" },
  { id: 4, name: "Finish" }
];

export const StepProgress = ({ currentStep }: StepProgressProps) => {
  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      {/* Desktop version */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200",
                  currentStep > step.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : currentStep === step.id
                    ? "border-primary text-primary bg-background"
                    : "border-muted-foreground/30 text-muted-foreground bg-background"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <span
                className={cn(
                  "ml-3 text-sm font-medium transition-colors duration-200",
                  currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.name}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-16 h-0.5 mx-4 transition-colors duration-200",
                  currentStep > step.id ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Mobile version */}
      <div className="md:hidden">
        <div className="flex items-center justify-center mb-4">
          <div
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200",
              "border-primary text-primary bg-background"
            )}
          >
            <span className="text-lg font-bold">{currentStep}</span>
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {steps[currentStep - 1]?.name}
          </h2>
          <div className="flex justify-center space-x-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors duration-200",
                  currentStep >= step.id ? "bg-primary" : "bg-border"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};