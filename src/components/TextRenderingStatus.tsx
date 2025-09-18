import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export type TextRenderingStatusType = 
  | "placing-caption"
  | "validating-caption"
  | "retrying-stronger-layout" 
  | "text-split-retrying"
  | "text-garbled-retrying"
  | "using-overlay-fallback"
  | "long-caption-detected"
  | "enhanced-rendering"
  | "completed"
  | null;

interface TextRenderingStatusProps {
  status: TextRenderingStatusType;
  className?: string;
}

export function TextRenderingStatus({ status, className = "" }: TextRenderingStatusProps) {
  if (!status || status === "completed") return null;

  const statusConfig = {
    "placing-caption": {
      text: "Placing caption...",
      variant: "secondary" as const,
      showSpinner: true
    },
    "retrying-stronger-layout": {
      text: "Retrying with stronger layout...",
      variant: "secondary" as const,
      showSpinner: true
    },
    "text-split-retrying": {
      text: "Text was split into blocks, retrying...",
      variant: "destructive" as const,
      showSpinner: true
    },
    "text-garbled-retrying": {
      text: "Text was garbled, retrying...",
      variant: "destructive" as const,
      showSpinner: true
    },
    "using-overlay-fallback": {
      text: "Using overlay fallback...",
      variant: "outline" as const,
      showSpinner: true
    },
    "validating-caption": {
      text: "Validating text clarity...",
      variant: "secondary" as const,
      showSpinner: true
    },
    "long-caption-detected": {
      text: "Long caption detected, using enhanced rendering...",
      variant: "outline" as const,
      showSpinner: true
    },
    "enhanced-rendering": {
      text: "Using enhanced prompt strength...",
      variant: "secondary" as const,
      showSpinner: true
    }
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant={config.variant} className="text-xs">
        {config.showSpinner && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
        {config.text}
      </Badge>
    </div>
  );
}