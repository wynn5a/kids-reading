"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button, buttonVariants } from "./button";

export interface NavLink {
  label: string;
  href: string;
}

export interface TopNavProps {
  brand?: string;
  links?: NavLink[];
  className?: string;
}

const defaultLinks: NavLink[] = [
  { label: "Library", href: "#library" },
  { label: "Levels", href: "#levels" },
  { label: "For parents", href: "#parents" },
  { label: "Pricing", href: "#pricing" },
];

/**
 * Sticky white nav bar (56px). Logo left, links inline, the black/white pill
 * pair right-anchored. Below the tablet breakpoint links collapse into a
 * full-canvas overlay; the two CTAs stay on the bar.
 */
export function TopNav({
  brand = "Storyloft",
  links = defaultLinks,
  className,
}: TopNavProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-canvas border-b border-hairline",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-content items-center justify-between gap-4 px-6 md:px-12">
        <a href="#top" className="text-card-title tracking-tight text-ink">
          {brand}
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={buttonVariants("tertiary")}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="#schools"
            className={cn(buttonVariants("secondary"), "hidden sm:inline-flex")}
          >
            For schools
          </a>
          <a href="#start" className={buttonVariants("primary")}>
            Start free
          </a>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-surface-soft md:hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              {open ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-hairline px-6 py-4 md:hidden">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-link rounded-md px-2 py-2 text-ink hover:bg-surface-soft"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#schools"
            onClick={() => setOpen(false)}
            className="text-link rounded-md px-2 py-2 text-ink hover:bg-surface-soft sm:hidden"
          >
            For schools
          </a>
        </nav>
      )}
    </header>
  );
}

/** Re-export so consumers can compose nav CTAs with the same pill styling. */
export { Button };
