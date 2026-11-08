"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { connect, disconnect, lookup, lookupStored, switchEntity, type Option } from "@/app/settings/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const KEYS_URL = "https://app.nuvion.dev/dashboard/settings";
const DOCS_URL = "https://docs.nuvion.co/authentication";

const selectClass = "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function SettingsForm({ connectedEntityId }: { connectedEntityId: string | null }) {
  const [pending, start] = useTransition();
  const [apiKey, setApiKey] = useState("");
  const [entities, setEntities] = useState<Option[] | null>(null);
  const [entityId, setEntityId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState<Option[] | null>(null);
  const [pick, setPick] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const run = (fn: () => Promise<void>) => start(async () => { setError(null); setMessage(null); await fn(); });

  if (connectedEntityId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CircleCheck className="size-5 text-ok" aria-hidden /> You&apos;re connected</CardTitle>
          <CardDescription>The payroll app runs in your own Nuvion sandbox. Your key is sealed in this browser session and expires after eight hours.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <dl className="grid grid-cols-[6rem_1fr] gap-y-2">
            <dt className="text-muted-foreground">Entity</dt><dd className="font-mono break-all">{connectedEntityId}</dd>
          </dl>
          {message && <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert>}
          {switching ? (
            <div className="space-y-3 rounded-xl border p-4">
              <Label htmlFor="switch-entity">Switch to another entity</Label>
              <select id="switch-entity" className={selectClass} value={pick} onChange={(e) => setPick(e.target.value)}>
                {switching.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <div className="flex gap-3">
                <Button disabled={pending || !pick || pick === connectedEntityId} onClick={() => run(async () => {
                  const r = await switchEntity({ entityId: pick });
                  if (!r.ok) return setMessage(r.error);
                  setSwitching(null);
                })}>{pending ? "Switching…" : "Switch"}</Button>
                <Button variant="ghost" onClick={() => setSwitching(null)}>Cancel</Button>
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button render={<Link href="/" />} nativeButton={false}>Open the payroll app</Button>
            <Button variant="outline" disabled={pending} onClick={() => run(async () => {
              const r = await lookupStored();
              if (!r.ok) return setMessage(r.error);
              setSwitching(r.entities);
              setPick(r.entities.find((e) => e.id === connectedEntityId)?.id ?? r.entities[0]?.id ?? "");
            })}>Switch entity</Button>
            <Button variant="ghost" disabled={pending} onClick={() => run(async () => { await disconnect(); })}>Disconnect and forget my key</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Your sandbox API key</CardTitle>
          <CardDescription>
            Open <a className="font-medium underline underline-offset-4" href={KEYS_URL} target="_blank" rel="noreferrer">Settings &gt; Developers</a> in the sandbox dashboard
            (<a className="underline underline-offset-4" href={DOCS_URL} target="_blank" rel="noreferrer">how API keys work</a>). Use a sandbox key only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Sandbox API key</Label>
            <Input id="apiKey" type="password" autoComplete="off" spellCheck={false} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="nv_test_…" />
          </div>
          <Button disabled={pending || apiKey.trim().length < 10} onClick={() => run(async () => {
            const r = await lookup({ apiKey });
            if (!r.ok) return setError(r.error);
            setEntities(r.entities);
            setEntityId(r.entities[0]?.id ?? "");
            if (r.entities.length === 0) setError("No approved entities found. Create and submit one in the dashboard, then try again.");
          })}>{pending && !entities ? "Looking up…" : "Look up my entities"}</Button>
        </CardContent>
      </Card>

      {entities && entities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Pick the paying entity</CardTitle>
            <CardDescription>Its USD account funds the payments and its counterparties are your contractors.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="entity">Entity</Label>
              <select id="entity" className={selectClass} value={entityId} onChange={(e) => setEntityId(e.target.value)}>
                {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <Button disabled={pending || !entityId} onClick={() => run(async () => {
              const r = await connect({ apiKey, entityId });
              if (!r.ok) return setError(r.error);
              setApiKey(""); // the server has sealed it; the page no longer needs to hold it
            })}>{pending ? "Connecting…" : "Connect"}</Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>That didn&apos;t work</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
