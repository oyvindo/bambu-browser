"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type NativeSelectFieldProps = {
  className?: string;
  children: React.ReactNode;
};

/** Wraps a native select (use `appearance-none` + `pr-8` on it) and draws an inset chevron. */
export function NativeSelectField({
  className,
  children,
}: NativeSelectFieldProps) {
  return (
    <div className={cn("relative min-w-0", className)}>
      {children}
      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
        aria-hidden
      />
    </div>
  );
}
