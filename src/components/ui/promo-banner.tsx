import * as React from "react";
import { cn } from "@/lib/cn";

export interface PromoBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Right-edge action — typically a magenta promo Button. */
  action?: React.ReactNode;
}

/**
 * Lilac inline banner ("Save your spot"). Carries a single magenta promo CTA on
 * the right edge against the already-colored panel.
 */
export function PromoBanner({
  className,
  action,
  children,
  ...props
}: PromoBannerProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        "bg-block-lilac text-ink rounded-md px-6 py-4 text-body-sm",
        className,
      )}
      {...props}
    >
      <div>{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
