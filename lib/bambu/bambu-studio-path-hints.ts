/** Hints for “Go to folder” / Explorer — browser cannot open these paths automatically. */

export type BambuStudioPathHints = {
  /** Short label for UI, e.g. "macOS" */
  platformLabel: string;
  /** Typical folder path as shown to the user */
  typicalPath: string;
  /** Extra tip (e.g. Finder shortcut) */
  tip: string;
};

function isLikelyMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent ?? "");
}

function isLikelyWindows(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Win/i.test(navigator.userAgent ?? "");
}

export function getBambuStudioPathHints(): BambuStudioPathHints {
  if (isLikelyMac()) {
    return {
      platformLabel: "macOS",
      typicalPath: "~/Library/Application Support/BambuStudio",
      tip: "Finder → Go → Go to Folder… (⇧⌘G), paste the path. The Library folder is hidden in normal browsing.",
    };
  }
  if (isLikelyWindows()) {
    return {
      platformLabel: "Windows",
      typicalPath: "%USERPROFILE%\\BambuStudio",
      tip: "Paste into File Explorer address bar after replacing %USERPROFILE% with your user folder, or check AppData\\Roaming if you use a custom install.",
    };
  }
  return {
    platformLabel: "Linux / other",
    typicalPath: "~/BambuStudio",
    tip: "Choose the folder that contains users/ or user/ and system/BBL/…",
  };
}
