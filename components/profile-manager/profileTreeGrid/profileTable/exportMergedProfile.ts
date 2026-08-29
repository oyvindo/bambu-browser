import { mergedProfileJsonString } from "@/lib/bambu/chain-display";
import { formatProfileJson } from "@/lib/bambu/profile-leaf-editor";
import type { InheritanceChainLevel } from "@/lib/bambu/resolver";
import { fileLabel } from "@/components/profile-manager/profileTreeGrid/profileTable/fileLabel";

export function isCustomLeafColumn(
  chain: readonly InheritanceChainLevel[],
  columnIndex: number,
): boolean {
  const level = chain[columnIndex];
  return Boolean(
    level &&
    columnIndex === chain.length - 1 &&
    (level.relativePath.startsWith("user/") ||
      level.relativePath.startsWith("users/")) &&
    String(level.data.from).toLowerCase() !== "system",
  );
}

export function profileColumnJson(
  chain: readonly InheritanceChainLevel[],
  columnIndex: number,
): string {
  const level = chain[columnIndex];
  if (!level) return "";
  return isCustomLeafColumn(chain, columnIndex)
    ? formatProfileJson(level.data)
    : mergedProfileJsonString(chain, columnIndex);
}

export const copyProfileColumnToClipboard = async (
  chain: readonly InheritanceChainLevel[],
  columnIndex: number,
): Promise<void> => {
  const json = profileColumnJson(chain, columnIndex);
  await navigator.clipboard.writeText(json);
};

export const downloadProfileColumnJson = (
  chain: readonly InheritanceChainLevel[],
  columnIndex: number,
): void => {
  const level = chain[columnIndex];
  if (!level) return;
  const json = profileColumnJson(chain, columnIndex);
  const filename = fileLabel(level.relativePath);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
