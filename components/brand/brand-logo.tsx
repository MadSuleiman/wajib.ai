import type { SVGProps } from "react";

import { cn } from "@/lib/utils";
import {
  ARABIC_LETTERING_PATH,
  ARABIC_WAW_TRANSFORM,
  LATIN_PATH,
  LATIN_VIEW_BOX,
  WAW_PATH,
  WAW_VIEW_BOX,
} from "@/lib/brand-paths";

export function BrandMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={WAW_VIEW_BOX}
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden="true"
      className={cn("shrink-0", className)}
      {...props}
    >
      <path d={WAW_PATH} />
    </svg>
  );
}

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Wajib"
      className={cn("inline-flex items-center gap-2.5 text-primary", className)}
    >
      <BrandMark className="h-10 w-8" />
      <svg
        viewBox={LATIN_VIEW_BOX}
        fill="currentColor"
        fillRule="evenodd"
        aria-hidden="true"
        className="h-7 w-24"
      >
        <path d={LATIN_PATH} />
      </svg>
    </span>
  );
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 805 495"
      fill="currentColor"
      fillRule="evenodd"
      role="img"
      aria-label="Wajib — واجب"
      className={cn("text-primary", className)}
    >
      <path d={ARABIC_LETTERING_PATH} />
      <path d={WAW_PATH} transform={ARABIC_WAW_TRANSFORM} />
      <path d={LATIN_PATH} transform="translate(218 387)" />
    </svg>
  );
}
