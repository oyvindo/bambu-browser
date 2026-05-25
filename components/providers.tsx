import * as React from "react";
import { ThemeProvider } from "@wrksz/themes/next";

import { LocaleProvider } from "@/localization/context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <LocaleProvider>
        <div className="flex h-full min-h-0 flex-1 flex-col">{children}</div>
      </LocaleProvider>
    </ThemeProvider>
  );
}
