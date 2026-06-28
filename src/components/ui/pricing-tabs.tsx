"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface PricingTabsProps {
  options: string[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

/**
 * Pill segmented control. Selected tab reuses the primary surface (black) — in
 * this system "selected = primary CTA", which makes the active tab feel live.
 */
export function PricingTabs({
  options,
  value,
  defaultValue,
  onValueChange,
  className,
}: PricingTabsProps) {
  const [internal, setInternal] = React.useState(defaultValue ?? options[0]);
  const selected = value ?? internal;

  function select(option: string) {
    if (value === undefined) setInternal(option);
    onValueChange?.(option);
  }

  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex flex-wrap gap-1 rounded-pill bg-surface-soft p-1",
        className,
      )}
    >
      {options.map((option) => {
        const isSelected = option === selected;
        return (
          <button
            key={option}
            role="tab"
            type="button"
            aria-selected={isSelected}
            onClick={() => select(option)}
            className={cn(
              "text-button rounded-pill px-4 py-2 transition-colors cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-soft",
              isSelected
                ? "bg-primary text-on-primary"
                : "text-ink hover:bg-canvas",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
