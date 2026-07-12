import { cn } from "@/lib/utils";

interface TextShimmerProps {
  children: string;
  className?: string;
  duration?: number;
}

export function TextShimmer({
  children,
  className,
  duration = 1.8,
}: TextShimmerProps) {
  return (
    <span
      className={cn("text-shimmer", className)}
      style={{ "--shimmer-duration": `${duration}s` } as React.CSSProperties}
    >
      {children}
    </span>
  );
}
