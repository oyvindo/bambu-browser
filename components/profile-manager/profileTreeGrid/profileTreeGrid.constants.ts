export const STICKY_HEADER_SURFACE =
  "bg-background shadow-[0_6px_16px_-4px_rgb(15_23_42_/_0.18),0_2px_6px_-2px_rgb(15_23_42_/_0.1)] dark:shadow-[0_8px_20px_-4px_rgb(0_0_0_/_0.55),0_2px_8px_-2px_rgb(0_0_0_/_0.4)]";

/** No overflow-* here: any overflow other than visible between the scroll parent and thead breaks position:sticky. */
export const TABLE_FRAME =
  "border-border bg-background mx-2 mb-2 min-w-0 rounded-lg border";
