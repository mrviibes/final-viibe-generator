import { cn } from "@/lib/utils";

interface StepProgressProps {
  currentStep: number;
}

const steps = [
  { id: 1, name: "Category" },
  { id: 2, name: "Text" },
  { id: 3, name: "Visuals" },
  { id: 4, name: "YOUR VIIBE" }
];

export const StepProgress = ({ currentStep }: StepProgressProps) => {
  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      {/* Desktop version */}
      <div className="hidden md:flex items-center justify-center">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200",
                  currentStep === step.id
                    ? "border-[#0db0de] text-[#0db0de] bg-background"
                    : "border-muted-foreground/30 text-muted-foreground bg-background"
                )}
              >
                <span className="text-sm font-medium">{step.id}</span>
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium transition-colors duration-200",
                  currentStep === step.id ? "text-[#0db0de]" : "text-muted-foreground"
                )}
              >
                {step.name}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="w-16 md:w-24 h-px bg-border mx-3 md:mx-5 self-start mt-5" />
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
              "border-[#0db0de] text-[#0db0de] bg-background"
            )}
          >
            <span className="text-lg font-bold">{currentStep}</span>
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[#0db0de] mb-2">
            {steps[currentStep - 1]?.name}
          </h2>
          <div className="flex justify-center space-x-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors duration-200",
                  currentStep >= step.id ? "bg-[#0db0de]" : "bg-border"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};