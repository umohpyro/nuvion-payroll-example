"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { addContractor, loadBanks } from "@/app/actions";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CORRIDOR_IDS, CORRIDORS, SEPA_COUNTRIES, routingProblem, type CorridorId, type Routing } from "@/lib/corridors";

const PROFILE = { firstName: "", lastName: "", email: "", line1: "", city: "", postcode: "" };

function Field({ id, label, children, hint }: { id: string; label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ContractorForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [corridor, setCorridor] = useState<CorridorId>("GBP");
  const [profile, setProfile] = useState(PROFILE);
  const [routing, setRouting] = useState<Routing>({ country: "DE" });
  const [banks, setBanks] = useState<{ code: string; name: string }[] | null>(null);

  useEffect(() => {
    if (corridor !== "NGN" || banks) return;
    void loadBanks().then((r) => (r.ok ? setBanks(r.banks) : toast.error(r.error)));
  }, [corridor, banks]);

  const p = (k: keyof typeof PROFILE) => (e: React.ChangeEvent<HTMLInputElement>) => setProfile({ ...profile, [k]: e.target.value });
  const r = (k: keyof Routing) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setRouting({ ...routing, [k]: e.target.value });
  const problem = routingProblem(corridor, routing);
  const filled = Object.values(profile).every((v) => v.trim());
  const touched = Boolean(routing.accountNumber || routing.iban || routing.sortCode);

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await addContractor({ ...profile, corridor, routing });
          if (!res.ok) return void toast.error(res.error);
          toast.success("Contractor saved.");
          setProfile(PROFILE);
          setRouting({ country: "DE" });
          router.refresh();
        });
      }}
    >
      <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Use fake details only. Names, bank and phone details are sent to your Nuvion sandbox.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="c-first" label="First name"><Input id="c-first" value={profile.firstName} onChange={p("firstName")} maxLength={60} required /></Field>
        <Field id="c-last" label="Last name"><Input id="c-last" value={profile.lastName} onChange={p("lastName")} maxLength={60} required /></Field>
        <Field id="c-email" label="Email"><Input id="c-email" type="email" value={profile.email} onChange={p("email")} maxLength={120} required /></Field>
        <Field id="c-line1" label="Street address"><Input id="c-line1" value={profile.line1} onChange={p("line1")} maxLength={80} required /></Field>
        <Field id="c-city" label="City"><Input id="c-city" value={profile.city} onChange={p("city")} maxLength={60} required /></Field>
        <Field id="c-post" label="Postcode"><Input id="c-post" value={profile.postcode} onChange={p("postcode")} maxLength={12} required /></Field>
      </div>

      <fieldset className="space-y-4 rounded-xl border p-4">
        <legend className="px-1 text-sm font-semibold">Where they are paid</legend>
        <Field id="c-corridor" label="Country and currency" hint={`Paid over ${CORRIDORS[corridor].rail}.`}>
          <NativeSelect id="c-corridor" value={corridor} onChange={(e) => { setCorridor(e.target.value as CorridorId); setRouting({ country: "DE" }); }}>
            {CORRIDOR_IDS.map((c) => <option key={c} value={c}>{CORRIDORS[c].label}</option>)}
          </NativeSelect>
        </Field>

        {corridor === "GBP" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="c-sort" label="Sort code"><Input id="c-sort" inputMode="numeric" value={routing.sortCode ?? ""} onChange={r("sortCode")} placeholder="04-00-04" required /></Field>
            <Field id="c-acct" label="Account number"><Input id="c-acct" inputMode="numeric" value={routing.accountNumber ?? ""} onChange={r("accountNumber")} placeholder="12345678" required /></Field>
            <Field id="c-bank" label="Bank name"><Input id="c-bank" value={routing.bankName ?? ""} onChange={r("bankName")} maxLength={80} required /></Field>
          </div>
        )}

        {corridor === "EUR" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="c-country" label="Country">
              <NativeSelect id="c-country" value={routing.country ?? "DE"} onChange={r("country")}>
                {Object.entries(SEPA_COUNTRIES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </NativeSelect>
            </Field>
            <Field id="c-bank" label="Bank name"><Input id="c-bank" value={routing.bankName ?? ""} onChange={r("bankName")} maxLength={80} required /></Field>
            <Field id="c-iban" label="IBAN"><Input id="c-iban" value={routing.iban ?? ""} onChange={r("iban")} placeholder="DE89 3704 0044 0532 0130 00" className="font-mono" autoComplete="off" spellCheck={false} required /></Field>
            <Field id="c-bic" label="Bank BIC"><Input id="c-bic" value={routing.swiftBic ?? ""} onChange={r("swiftBic")} placeholder="COBADEFFXXX" className="font-mono" autoComplete="off" spellCheck={false} required /></Field>
          </div>
        )}

        {corridor === "NGN" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="c-ngbank" label="Bank" hint={banks ? undefined : "Loading the bank directory from Nuvion…"}>
              <NativeSelect
                id="c-ngbank"
                value={routing.bankCode ?? ""}
                disabled={!banks}
                onChange={(e) => setRouting({ ...routing, bankCode: e.target.value, bankName: banks?.find((b) => b.code === e.target.value)?.name ?? "" })}
                required
              >
                <option value="">Choose a bank</option>
                {banks?.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </NativeSelect>
            </Field>
            <Field id="c-acct" label="Account number" hint="10 digits."><Input id="c-acct" inputMode="numeric" value={routing.accountNumber ?? ""} onChange={r("accountNumber")} placeholder="0690000031" required /></Field>
          </div>
        )}
        {touched && problem && <p className="text-sm text-destructive">{problem}</p>}
      </fieldset>

      <Button type="submit" disabled={pending || !filled || Boolean(problem)}>{pending ? "Saving…" : "Save contractor"}</Button>
    </form>
  );
}
