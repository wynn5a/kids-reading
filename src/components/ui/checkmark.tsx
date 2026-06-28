import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Comparison-table check. Green glyph (not a surface), 16px, used to mark an
 * included feature in a pricing matrix.
 */
export function CheckGlyph({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      role="img"
      aria-label="Included"
      className={cn(
        "inline-flex items-center justify-center size-4 rounded-full text-success",
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
        <path
          d="M3.5 8.5l3 3 6-6.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
