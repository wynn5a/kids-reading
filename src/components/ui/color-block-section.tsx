import * as React from "react";
import { cn } from "@/lib/cn";

export type BlockColor =
  | "lime"
  | "lilac"
  | "cream"
  | "pink"
  | "mint"
  | "coral"
  | "navy";

const blockColors: Record<BlockColor, string> = {
  lime: "bg-block-lime text-ink",
  lilac: "bg-block-lilac text-ink",
  cream: "bg-block-cream text-ink",
  pink: "bg-block-pink text-ink",
  mint: "bg-block-mint text-ink",
  coral: "bg-block-coral text-ink",
  navy: "bg-block-navy text-inverse-ink",
};

export interface ColorBlockSectionProps
  extends React.HTMLAttributes<HTMLElement> {
  color?: BlockColor;
}

/**
 * The signature surface. A full-content-width pastel panel with lg corners and
 * xxl interior padding — the story lives here. Corners drop on mobile so the
 * block bleeds edge-to-edge like a poster (per spec).
 */
export function ColorBlockSection({
  color = "lime",
  className,
  ...props
}: ColorBlockSectionProps) {
  return (
    <section
      className={cn(
        "p-6 md:p-12 max-md:rounded-none rounded-lg",
        blockColors[color],
        className,
      )}
      {...props}
    />
  );
}
