import * as React from "react";
import { ThemeProvider } from "@wrksz/themes/next";

import { LocaleProvider } from "@/localization/context";
import { Toaster } from "@/components/ui/toast";

const THEMES = [
  "light",
  "dark",
  "frosted-aura",
  "inked",
  "slate",
  "frozen-mist",
  "sapphire-nightfall",
  "amethyst-dawn-haze",
] as const;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      themes={THEMES}
      defaultTheme="inked"
      enableSystem
      enableColorScheme
      disableTransitionOnChange
    >
      <LocaleProvider>
        <div className="flex h-full min-h-0 flex-1 flex-col">{children}</div>
        <Toaster timeout={8000} />
      </LocaleProvider>
    </ThemeProvider>
  );
}
