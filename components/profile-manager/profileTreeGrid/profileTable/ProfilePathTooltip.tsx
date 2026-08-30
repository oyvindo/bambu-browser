"use client";

import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/localization";
import { Tooltip } from "@base-ui/react/tooltip";

export function ProfilePathTooltip({
  filename,
  relativePath,
}: {
  filename: string;
  relativePath: string;
}) {
  const t = useTranslations();

  const copyPath = () => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(relativePath);
        toast.add({
          type: "success",
          title: t("treeGrid.fileNameCopied", { filename }),
        });
      } catch (error) {
        toast.add({
          type: "error",
          title: t("treeGrid.copyFailed"),
          description: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  };

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        type="button"
        className="text-foreground block max-w-full truncate text-left font-mono text-xs font-bold tabular-nums leading-snug"
        aria-label={`${filename}: ${relativePath}`}
      >
        {filename}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="bottom" sideOffset={8} className="z-50">
          <Tooltip.Popup
            className={cn(
              "bg-popover text-popover-foreground border-border max-w-[min(36rem,calc(100vw-1.5rem))] rounded-md border p-0 text-xs shadow-md",
              "leading-snug",
            )}
          >
            <button
              type="button"
              className="block w-full cursor-copy break-all px-3 py-2 text-left font-mono"
              onClick={copyPath}
            >
              {relativePath}
            </button>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
