import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** A plain select styled like Input: native pickers are accessible and work well on phones. */
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn("h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50", className)}
      {...props}
    />
  );
}
