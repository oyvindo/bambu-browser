"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { Info } from "lucide-react";

import { useLocale, useTranslations } from "@/localization/context";
import { propertyTooltipForKey } from "@/lib/bambu/property-tooltips";
import { cn } from "@/lib/utils/index";

export function PropertyHelpTooltip({
  label,
  propertyKey,
}: {
  label: string;
  propertyKey: string;
}) {
  const { locale } = useLocale();
  const t = useTranslations();
  const tooltip = propertyTooltipForKey(propertyKey, locale);
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        type="button"
        className={cn(
          "text-muted-foreground hover:text-foreground -mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-sm",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        aria-label={t("propertyTooltip.aboutAria", { label })}
      >
        <Info className="size-3.5 opacity-80" strokeWidth={2} aria-hidden />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" sideOffset={8} className="z-50">
          <Tooltip.Popup
            className={cn(
              "bg-popover text-popover-foreground border-border max-w-[min(20rem,calc(100vw-1.5rem))] rounded-md border px-3 py-2 text-xs shadow-md",
              "leading-snug",
            )}
          >
            <p>{tooltip.impact}</p>
            {tooltip.related ? (
              <p className="text-muted-foreground mt-2 border-border border-t pt-2 text-[11px] leading-snug">
                {tooltip.related}
              </p>
            ) : null}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
