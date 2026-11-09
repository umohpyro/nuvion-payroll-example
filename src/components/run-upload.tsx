"use client";

import { CircleAlert, CircleCheck, FileUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { payRun, quoteRun, type RunQuote, type RunResult } from "@/app/actions";
import { Ledger, LedgerRow } from "@/components/ledger";
import { NativeSelect } from "@/components/native-select";
import type { AccountOption } from "@/components/pay-form";
import { RunProgress } from "@/components/run-progress";
import { Button } from "@/components/ui/button";
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
  const [over, setOver] = useState(false);
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
  const totalMinor = (rows ?? []).reduce((s, r) => s + (r.row?.minor ?? 0), 0);
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
    const sent = results.filter((r) => r.ok).length;
    return (
      <div className="space-y-4" aria-live="polite">
        <section className="rounded-[22px] bg-card p-4 shadow-card ring-1 ring-foreground/10 sm:p-5">
          <h2 className="text-[0.72rem] font-bold tracking-[0.12em] text-c-text uppercase">Run submitted</h2>
          <p className="mt-1 mb-3 text-2xl font-extrabold">{sent} submitted{results.length - sent ? `, ${results.length - sent} not submitted` : ""}</p>
          <RunProgress paid={0} pending={sent} failed={results.length - sent} pendingLabel="Submitted" />
          <p className="mt-3 text-sm text-muted-foreground">Submitted means Nuvion accepted the transfer. Follow each person on the People page until the payout is paid or failed.</p>
        </section>
        <Ledger title="Result per person" count={`${results.length}`}>
          {results.map((r) => (
            <LedgerRow
              key={r.line}
              name={nameOf(r.line)}
              sub={`Line ${r.line}`}
              tone={r.ok ? "warn" : "bad"}
              right={r.ok ? <Link href={`/payments/${r.transferId}`} className="font-semibold text-c-text underline underline-offset-4">View payment</Link> : <span className="max-w-48 text-right text-destructive">{r.error}</span>}
            />
          ))}
        </Ledger>
        <div className="flex flex-wrap gap-3">
          <Link href="/people" className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground">People</Link>
          <Button variant="outline" className="h-11 rounded-full px-5" onClick={() => { setFile(null); setRows(null); reset(); }}>Upload another run</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="run-file"
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); void load(e.dataTransfer.files[0]); }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-[22px] border-2 border-dashed px-4 py-8 text-center transition-colors focus-within:ring-3 focus-within:ring-ring/50 ${over ? "border-c bg-c-soft" : rows ? "border-ok/60 bg-card" : problem ? "border-destructive/70 bg-card" : "border-c/50 bg-c-soft/60 hover:bg-c-soft"}`}
        >
          <span className={`grid size-12 place-items-center rounded-full text-c-foreground ${rows ? "bg-ok" : problem ? "bg-destructive" : "bg-c"}`}>
            {rows ? <CircleCheck className="size-6" aria-hidden /> : problem ? <CircleAlert className="size-6" aria-hidden /> : <FileUp className="size-6" aria-hidden />}
          </span>
          <span className="font-extrabold">{file ? file.name : "Drop your CSV here"}</span>
          <span className="text-sm text-muted-foreground">{file ? "Choose another file to replace it" : "or choose a file. Up to 20 rows, 100 KB."}</span>
          <input id="run-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => void load(e.target.files?.[0])} />
        </label>
        {problem && <p role="alert" className="mt-2 text-sm font-semibold text-destructive">{problem}</p>}
      </div>

      {rows && file && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="run-from">Pay from</Label>
            <NativeSelect id="run-from" className="max-w-md" value={accountId} onChange={(e) => { setAccountId(e.target.value); reset(); }}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.label} · {formatAmount(a.availableMinor, a.currency)}</option>)}
            </NativeSelect>
          </div>

          <Ledger
            title="Pay run"
            count={`${valid} of ${rows.length} valid`}
            total={account && (
              <>
                <span>
                  <span className="block text-[0.72rem] font-bold tracking-[0.12em] text-c-text uppercase">Run total</span>
                  {totalMinor > account.availableMinor && <span className="block text-xs font-semibold text-destructive">More than the {formatAmount(account.availableMinor, account.currency)} available</span>}
                </span>
                <span className="text-2xl font-extrabold tabular-nums">{formatAmount(totalMinor, account.currency)}</span>
              </>
            )}
          >
            {rows.map((r) => {
              const q = quotes?.find((x) => x.line === r.line);
              return (
                <LedgerRow
                  key={r.line}
                  name={r.row ? nameOf(r.line) : `Line ${r.line}`}
                  title={r.row ? nameOf(r.line) : `Line ${r.line}`}
                  sub={r.row ? `Line ${r.line} · to ${r.row.corridor}` : "Skipped until the file is fixed"}
                  tone={r.row ? (q && !q.ok ? "bad" : "ok") : "bad"}
                  right={r.row
                    ? <span className="font-bold tabular-nums">{account ? formatAmount(r.row.minor, account.currency) : ""}</span>
                    : <span className="flex items-center gap-1 font-semibold text-destructive"><CircleAlert className="size-4" aria-hidden />Not valid</span>}
                >
                  {r.errors.map((e) => <p key={e} className="text-destructive">{e}</p>)}
                  {q?.ok && (
                    <p className="rounded-lg bg-secondary px-3 py-2">
                      Receives <strong className="tabular-nums">{formatAmount(q.quote.amountTo, q.quote.toCurrency)}</strong> at 1 {account?.currency} = {q.quote.rate} {q.quote.toCurrency}
                      <span className="text-muted-foreground"> · {secondsLeft(q.quote.expiresAt, now) === 0 ? "expired" : `locked for ${secondsLeft(q.quote.expiresAt, now)}s`}</span>
                    </p>
                  )}
                  {q && !q.ok && <p className="text-destructive">{q.error}</p>}
                </LedgerRow>
              );
            })}
          </Ledger>
          {valid < rows.length && <p className="text-sm text-muted-foreground">Rows with errors are skipped. Fix the file and upload it again to include them.</p>}

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
