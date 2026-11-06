import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toDecimal } from "@/lib/money";

/** An amount field with a Max button that fills in the whole available balance. */
export function AmountInput({ maxMinor, onValue, ...props }: Omit<ComponentProps<typeof Input>, "onChange"> & { maxMinor?: number; onValue: (value: string) => void; value: string }) {
  return (
    <div className="flex max-w-56 gap-2">
      <Input inputMode="decimal" onChange={(e) => onValue(e.target.value)} {...props} />
      {maxMinor !== undefined && maxMinor > 0 && (
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => onValue(toDecimal(maxMinor))}>
          Max
        </Button>
      )}
    </div>
  );
}
