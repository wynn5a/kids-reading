import * as React from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "magenta";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap select-none cursor-pointer transition-transform duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  // The black "Get started" pill — the system's primary action.
  primary: "text-button rounded-pill px-5 py-2.5 bg-primary text-on-primary hover:bg-ink/90",
  // White pill counterpart. Spec lists no border; a hairline keeps it visible on white canvas.
  secondary:
    "text-button rounded-pill px-5 py-2.5 bg-canvas text-ink border border-hairline hover:bg-surface-soft",
  // Plain text styled as a button hit target (nav, footer).
  tertiary: "text-link rounded-full px-3 py-2 text-ink hover:bg-surface-soft",
  // Single-shot promo pink — reserved for one CTA inside an already-colored panel.
  magenta: "text-button rounded-pill px-[18px] py-2.5 bg-accent-magenta text-on-primary hover:brightness-95",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/** Returns the class string for a button variant — share with anchors styled as buttons. */
export function buttonVariants(variant: ButtonVariant = "primary") {
  return cn(base, variants[variant]);
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants(variant), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

type IconButtonVariant = "default" | "inverse";

const iconBase =
  "inline-flex items-center justify-center size-10 rounded-full transition-transform duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none";

const iconVariants: Record<IconButtonVariant, string> = {
  default: "bg-surface-soft text-ink hover:bg-hairline focus-visible:ring-offset-canvas",
  inverse:
    "bg-white/15 text-inverse-ink hover:bg-white/25 focus-visible:ring-offset-inverse-canvas",
};

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  "aria-label": string;
}

/** 40px circular icon button. `default` on light surfaces, `inverse` on dark color blocks. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "default", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(iconBase, iconVariants[variant], className)}
      {...props}
    />
  ),
);
IconButton.displayName = "IconButton";
