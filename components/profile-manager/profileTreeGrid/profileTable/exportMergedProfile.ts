import { mergedProfileJsonString } from "@/lib/bambu/chain-display";
import type { InheritanceChainLevel } from "@/lib/bambu/resolver";
import { fileLabel } from "@/components/profile-manager/profileTreeGrid/profileTable/fileLabel";

export const copyMergedProfileToClipboard = async (
  chain: readonly InheritanceChainLevel[],
  uptoInclusive: number,
): Promise<void> => {
  const json = mergedProfileJsonString(chain, uptoInclusive);
  await navigator.clipboard.writeText(json);
};

export const downloadMergedProfileJson = (
  chain: readonly InheritanceChainLevel[],
  uptoInclusive: number,
): void => {
  const level = chain[uptoInclusive];
  if (!level) return;
  const json = mergedProfileJsonString(chain, uptoInclusive);
  const filename = fileLabel(level.relativePath);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
