import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  // Ensure value is a number in [0, 100] and provide a defensive default
  const safeValue = typeof value === 'number' ? Math.max(0, Math.min(value, 100)) : 0;

  // Hide the indicator completely when there's no progress to avoid 1px slivers
  // caused by sub-pixel rendering and CSS transitions on some browsers.
  const indicatorStyle: React.CSSProperties = safeValue <= 0
    ? { transform: `translateX(-100%)`, display: 'none' }
    : { transform: `translateX(-${100 - safeValue}%)` };

  return (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={indicatorStyle}
    />
  </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
