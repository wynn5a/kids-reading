import * as React from "react";
import { cn } from "@/lib/cn";

export interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

/**
 * Form field. Hairline border at rest; focus is communicated via ring, not a
 * fill change (per spec). md corners, body type.
 */
export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, label, hint, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-body-sm text-ink">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full bg-canvas text-ink text-body rounded-md px-3.5 py-3",
            "border border-hairline placeholder:text-ink/40",
            "focus:outline-none focus:border-transparent focus:ring-2 focus:ring-primary",
            className,
          )}
          {...props}
        />
        {hint && <p className="text-body-sm text-ink/60">{hint}</p>}
      </div>
    );
  },
);
TextInput.displayName = "TextInput";
