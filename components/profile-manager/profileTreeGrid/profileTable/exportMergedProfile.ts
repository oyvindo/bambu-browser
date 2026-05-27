import { mergedProfileJsonString } from "@/lib/bambu/chain-display";
import type { InheritanceChainLevel } from "@/lib/bambu/resolver";
import { fileLabel } from "@/components/profile-manager/profileTreeGrid/profileTable/fileLabel";

export const copyMergedProfileToClipboard = async (
  chain: readonly InheritanceChainLevel[],
): Promise<void> => {
  const json = mergedProfileJsonString(chain);
  await navigator.clipboard.writeText(json);
};

export const downloadMergedProfileJson = (
  chain: readonly InheritanceChainLevel[],
): void => {
  const leaf = chain[chain.length - 1];
  if (!leaf) return;
  const json = mergedProfileJsonString(chain);
  const filename = fileLabel(leaf.relativePath);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
