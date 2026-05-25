import { cn } from "@/lib/utils";
import * as React from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import {
  STICKY_HEADER_SURFACE,
  TABLE_FRAME,
} from "@/components/profile-manager/profileTreeGrid/profileTreeGrid.constants";

type ProfileTreeGridWrapperProps = {
  children: React.ReactNode;
  className?: string;
  compareAccordion?: React.ReactNode;
};
export function ProfileTreeGridWrapper({
  children,
  className,
  compareAccordion,
}: ProfileTreeGridWrapperProps) {
  return (
    <Tooltip.Provider delay={400}>
      <div className={cn(TABLE_FRAME, className)}>
        {compareAccordion ? (
          <div
            className={cn(
              "border-border sticky top-0 z-30 isolate border-b",
              STICKY_HEADER_SURFACE,
            )}
          >
            {compareAccordion}
          </div>
        ) : null}
        {children}
      </div>
    </Tooltip.Provider>
  );
}
