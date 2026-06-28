import * as React from "react";
import { cn } from "@/lib/cn";
import { Caption } from "./typography";

export interface FooterColumn {
  heading: string;
  links: string[];
}

export interface FooterProps extends React.HTMLAttributes<HTMLElement> {
  brand?: string;
  columns?: FooterColumn[];
}

const defaultColumns: FooterColumn[] = [
  { heading: "Read", links: ["Library", "Levels", "Read-alouds", "Offline"] },
  { heading: "Grown-ups", links: ["For parents", "For schools", "Progress", "Safety"] },
  { heading: "Company", links: ["About", "Careers", "Press", "Contact"] },
  { heading: "Help", links: ["Support", "Accessibility", "Privacy", "Terms"] },
];

/**
 * Dense link grid on white canvas. Wordmark set in display weight; column heads
 * in mono caption. Section padding top/bottom, xl gutters.
 */
export function Footer({
  brand = "Storyloft",
  columns = defaultColumns,
  className,
  ...props
}: FooterProps) {
  return (
    <footer
      className={cn("bg-canvas text-ink border-t border-hairline", className)}
      {...props}
    >
      <div className="mx-auto max-w-content px-6 py-16 md:px-8 md:py-24">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div className="col-span-2 md:col-span-1">
            <p className="text-display-lg leading-none tracking-tight">{brand}</p>
            <p className="mt-3 text-body-sm text-ink/60">
              Reading that grows with every kid.
            </p>
          </div>
          {columns.map((column) => (
            <nav key={column.heading} className="flex flex-col gap-3">
              <Caption className="text-ink/50">{column.heading}</Caption>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-body-sm text-ink hover:underline underline-offset-4"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-16 flex flex-col gap-2 border-t border-hairline-soft pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Caption className="text-ink/50">
            © {brand} — built for early readers
          </Caption>
          <Caption className="text-ink/50">Made with color & care</Caption>
        </div>
      </div>
    </footer>
  );
}
