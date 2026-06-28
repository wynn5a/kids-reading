import * as React from "react";
import { cn } from "@/lib/cn";

export interface MarqueeStripProps
  extends React.HTMLAttributes<HTMLDivElement> {
  items: string[];
}

/**
 * Thin black ribbon under the nav that scrolls white labels. The content is
 * duplicated so the loop is seamless; motion pauses under reduced-motion.
 */
export function MarqueeStrip({ items, className, ...props }: MarqueeStripProps) {
  const row = (
    <ul className="flex shrink-0 items-center gap-12 px-6" aria-hidden="false">
      {items.map((item, i) => (
        <li key={i} className="text-body-sm whitespace-nowrap">
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className={cn(
        "h-9 overflow-hidden bg-inverse-canvas text-inverse-ink flex items-center",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-full shrink-0 animate-marquee items-center motion-reduce:animate-none">
        {row}
        {/* duplicate for seamless wrap (hidden from a11y tree) */}
        <div aria-hidden="true" className="flex">
          {row}
        </div>
      </div>
    </div>
  );
}
