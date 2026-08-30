export function isDesktopShell(): boolean {
  return (
    typeof navigator !== "undefined" &&
    /\bElectron\b/i.test(navigator.userAgent ?? "")
  );
}
