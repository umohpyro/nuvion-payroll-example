import { Badge } from "@/components/ui/badge";
import type { TransferStatus } from "@/lib/nuvion";

const LABEL: Record<TransferStatus, string> = { new: "Created", pending: "Pending", successful: "Paid", failed: "Failed" };

export function StatusBadge({ status }: { status: TransferStatus }) {
  const tone = status === "successful" ? "bg-ok/15 text-ok" : status === "failed" ? "bg-destructive/15 text-destructive" : "bg-warn/15 text-warn";
  return <Badge className={tone}>{LABEL[status] ?? status}</Badge>;
}
