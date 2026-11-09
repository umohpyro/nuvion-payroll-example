import { CircleCheck, CircleX, Clock } from "lucide-react";

/** Pay-run progress: one bar split into paid, pending and failed, with a count for each so colour is never the only signal. */
export function RunProgress({ paid, pending, failed, pendingLabel = "Pending" }: { paid: number; pending: number; failed: number; pendingLabel?: string }) {
  const total = paid + pending + failed;
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div>
      {total > 0 && (
        <div role="img" aria-label={`${paid} paid, ${pending} ${pendingLabel.toLowerCase()}, ${failed} failed`} className="flex h-3 overflow-hidden rounded-full bg-muted">
          <span className="bg-ok" style={{ width: pct(paid) }} />
          <span className="bg-warn" style={{ width: pct(pending) }} />
          <span className="bg-destructive" style={{ width: pct(failed) }} />
        </div>
      )}
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
        <li className="flex items-center gap-1.5 text-ok"><CircleCheck className="size-4" aria-hidden />{paid} Paid</li>
        <li className="flex items-center gap-1.5 text-warn"><Clock className="size-4" aria-hidden />{pending} {pendingLabel}</li>
        <li className="flex items-center gap-1.5 text-destructive"><CircleX className="size-4" aria-hidden />{failed} Failed</li>
      </ul>
    </div>
  );
}
