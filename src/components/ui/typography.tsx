import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Mono uppercase section marker. figmaMono's job: flag taxonomy without
 * competing with display type. Always uppercase, positive tracking.
 */
export function Eyebrow({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("font-mono uppercase text-eyebrow text-ink", className)}
      {...props}
    />
  );
}

/** Smallest mono label — footer column heads, captions. */
export function Caption({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("font-mono uppercase text-caption text-ink", className)}
      {...props}
    />
  );
}
