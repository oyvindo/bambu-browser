import type { SVGProps } from "react";

/**
 * Stylized bamboo-stalk mark — descriptive icon for the BambuStudio source.
 * Not an official Bambu Lab logo.
 */
export function BambuStudioIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9 21V3" />
      <path d="M9 7h3" />
      <path d="M9 12h3" />
      <path d="M9 17h3" />
      <path d="M14 5c2 1.5 3 3.5 3 6s-1 4.5-3 6" />
      <path d="M5 9c-1 1-1.5 2.5-1 4s1.5 2.5 3 3" />
    </svg>
  );
}

/**
 * Stylized orca silhouette — descriptive icon for the OrcaSlicer source.
 * Not an official OrcaSlicer logo.
 */
export function OrcaSlicerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 14c1.5-3 4.5-5 9-5 3 0 5.5 1 7.5 3 .8.8 1.5 1.5 1.5 2.5 0 .8-.7 1.2-1.5 1l-2-.5" />
      <path d="M12 9V5l3 2" />
      <path d="M5 15c0 1.5 1 3 3 3" />
      <circle cx="17" cy="13" r="0.6" fill="currentColor" stroke="none" />
      <path d="M14 14.5c1.5 1 3.5 1 5 0" />
    </svg>
  );
}
