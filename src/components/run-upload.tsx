"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { payRun, quoteRun, type RunQuote, type RunResult } from "@/app/actions";
import type { AccountOption } from "@/components/pay-form";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_BYTES, parseRun, type ParsedRow } from "@/lib/csv";
import { formatAmount } from "@/lib/money";
import { secondsLeft } from "@/lib/payroll";

/** One run ID per uploaded file: it is part of every transfer reference, so sending the same run twice cannot pay twice. */
const newRunId = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("");

export function RunUpload({ accounts }: { accounts: AccountOption[] }) {
  const [pending, start] = useTransition();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [file, setFile] = useState<{ name: string; csv: string; runId: string } | null>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<RunQuote[] | null>(null);
  const [results, setResults] = useState<RunResult[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const account = accounts.find((a) => a.id === accountId);

  useEffect(() => {
    if (!quotes) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [quotes]);

  const nameOf = (line: number) => {
    const r = rows?.find((x) => x.line === line)?.row;
    return r ? `${r.firstName} ${r.lastName}` : `Line ${line}`;
  };
  const good = (quotes ?? []).flatMap((q) => (q.ok ? [{ line: q.line, quote: q.quote }] : []));
  const expired = good.some((g) => secondsLeft(g.quote.expiresAt, now) === 0);
  const valid = (rows ?? []).filter((r) => r.row).length;
  const reset = () => { setQuotes(null); setResults(null); };

  async function load(f: File | undefined) {
    reset(); setRows(null); setProblem(null); setFile(null);
    if (!f) return;
    if (f.size > MAX_BYTES) return setProblem("This file is too large. A pay run is at most 20 rows.");
    const csv = await f.text();
    try {
      setRows(parseRun(csv));
      setFile({ name: f.name, csv, runId: newRunId() });
    } catch (e) {
      setProblem((e as Error).message);
    }
  }

  if (results && file) {
    const paid = results.filter((r) => r.ok).length;
    return (
      <div className="space-y-4" aria-live="polite">
        <p className="text-lg font-bold">{paid} submitted{results.length - paid ? `, ${results.length - paid} not submitted` : ""}</p>
        <p className="text-sm text-muted-foreground">Submitted means Nuvion accepted the transfer. Follow each person on the People page until the payout is paid or failed.</p>
        <ul className="divide-y rounded-xl border bg-card text-sm">
          {results.map((r) => (
            <li key={r.line} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span className="font-medium">{nameOf(r.line)}</span>
              {r.ok ? <Link href={`/payments/${r.transferId}`} className="font-semibold text-pink-text underline underline-offset-4">View payment</Link> : <span className="text-destructive">{r.error}</span>}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <Link href="/people" className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground">People</Link>
          <Button variant="outline" onClick={() => { setFile(null); setRows(null); reset(); }}>Upload another run</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="run-file">CSV file</Label>
        <Input id="run-file" type="file" accept=".csv,text/csv" onChange={(e) => void load(e.target.files?.[0])} />
        {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
      </div>

      {rows && file && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="run-from">Pay from</Label>
            <NativeSelect id="run-from" className="max-w-md" value={accountId} onChange={(e) => { setAccountId(e.target.value); reset(); }}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.label} · {formatAmount(a.availableMinor, a.currency)}</option>)}
            </NativeSelect>
          </div>

          <p className="text-sm"><strong>{file.name}</strong>: {valid} of {rows.length} row{rows.length === 1 ? "" : "s"} valid. {valid < rows.length && "Rows with errors are skipped; fix the file and upload it again to include them."}</p>
          <ul className="divide-y rounded-xl border bg-card">
            {rows.map((r) => {
              const q = quotes?.find((x) => x.line === r.line);
              return (
                <li key={r.line} className="space-y-1 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{r.row ? nameOf(r.line) : `Line ${r.line}`} <span className="font-normal text-muted-foreground">line {r.line}</span></span>
                    {r.row ? <span className="tabular-nums">{account ? formatAmount(r.row.minor, account.currency) : ""} to {r.row.corridor}</span> : <span className="font-semibold text-destructive">Not valid</span>}
                  </div>
                  {r.errors.map((e) => <p key={e} className="text-destructive">{e}</p>)}
                  {q?.ok && (
                    <p className="rounded-lg bg-secondary px-3 py-2">
                      Receives <strong className="tabular-nums">{formatAmount(q.quote.amountTo, q.quote.toCurrency)}</strong> at 1 {account?.currency} = {q.quote.rate} {q.quote.toCurrency}
                      <span className="text-muted-foreground"> · {secondsLeft(q.quote.expiresAt, now) === 0 ? "expired" : `locked for ${secondsLeft(q.quote.expiresAt, now)}s`}</span>
                    </p>
                  )}
                  {q && !q.ok && <p className="text-destructive">{q.error}</p>}
                </li>
              );
            })}
          </ul>

          <Button
            size="lg"
            className="h-11 rounded-full px-6"
            disabled={pending || valid === 0}
            onClick={() => start(async () => {
              if (quotes && !expired && good.length) {
                const r = await payRun({ accountId, runId: file.runId, csv: file.csv, items: good.map((g) => ({ line: g.line, quoteId: g.quote.id })) });
                if (!r.ok) return void toast.error(r.error);
                return void setResults(r.results);
              }
              const r = await quoteRun({ accountId, csv: file.csv });
              if (!r.ok) return void toast.error(r.error);
              setQuotes(r.quotes);
              setNow(Date.now());
            })}
          >
            {pending ? "Working…" : quotes && !expired && good.length ? `Pay ${good.length} ${good.length === 1 ? "person" : "people"}` : quotes ? "Get new quotes" : "Get quotes"}
          </Button>
        </>
      )}
    </div>
  );
}
