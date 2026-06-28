import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Hairline-stroked white container — the pricing-card surface. Stroked, never
 * shadowed: color blocks carry depth in this system, not elevation.
 */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-canvas text-ink rounded-lg p-6 border border-hairline",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Off-white thumbnail tile — home "explore" grid, template gallery. Smaller
 * corners, surface-soft ground.
 */
export function TemplateCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface-soft text-ink rounded-md p-4 text-body-sm",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Larger composition tile that holds a product mock or pastel illustration.
 * Mono eyebrow label, surface-soft ground.
 */
export function FeatureTile({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface-soft text-ink rounded-md p-6",
        className,
      )}
      {...props}
    />
  );
}
