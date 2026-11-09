import { SAMPLE_CSV } from "@/lib/csv";

export function GET() {
  return new Response(SAMPLE_CSV, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="sample-pay-run.csv"' } });
}
