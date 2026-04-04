"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <label className="text-muted-foreground flex items-center gap-1 text-xs whitespace-nowrap">
      Theme
      <select
        className="border-input bg-background h-8 min-w-30 rounded-md border px-2 text-sm"
        value={mounted ? theme : "system"}
        onChange={(e) => setTheme(e.target.value)}
        disabled={!mounted}
        aria-label="Color theme"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  );
}
