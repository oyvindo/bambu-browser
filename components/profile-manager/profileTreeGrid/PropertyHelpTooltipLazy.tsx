import { lazy, Suspense } from "react";
import type { ProfileKind, SlicerSource } from "@/lib/bambu";

const LazyPropertyHelpTooltip = lazy(async () => {
  const mod = await import("./propertyHelpTooltipLazy/PropertyHelpTooltip");
  return { default: mod.PropertyHelpTooltip };
});

export function PropertyHelpTooltipLazy(props: {
  label: string;
  propertyKey: string;
  profileKind: ProfileKind;
  slicer: SlicerSource;
}) {
  return (
    <Suspense
      fallback={
        <span className="-mt-0.5 inline-block size-5 shrink-0" aria-hidden />
      }
    >
      <LazyPropertyHelpTooltip {...props} />
    </Suspense>
  );
}
