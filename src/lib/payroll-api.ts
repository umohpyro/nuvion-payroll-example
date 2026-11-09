import "server-only";
import { CORRIDORS, isCorridor, last4, paymentDetailBody, type CorridorId, type Routing } from "@/lib/corridors";
import { getConfig } from "@/lib/config";
import { nuvion, type ApiAccount, type ApiTransfer, type Counterparty, type FxQuote, type List, type PaymentDetail } from "@/lib/nuvion";

/** The visitor's entity. Every Nuvion call acts for it. */
const entityId = async () => (await getConfig()).entityId;

export const listAccounts = async (): Promise<ApiAccount[]> => (await nuvion<List<ApiAccount>>("GET", `/accounts?entity_id=${await entityId()}&limit=100`)).data;

export async function loadTransfers(limit = 50): Promise<ApiTransfer[]> {
  return (await nuvion<List<ApiTransfer>>("GET", `/transfers?entity_id=${await entityId()}&limit=${limit}`)).data;
}

export const getQuoteById = async (id: string) => nuvion<FxQuote>("GET", `/fx-quotes/${id}?entity_id=${await entityId()}`);

/* ---------------- Contractors: individual counterparties tagged in their `meta` ---------------- */

export interface Contractor {
  id: string;
  name: string;
  corridor: CorridorId;
  country: string;
  bank: string;
  last4: string;
}

const PREFIX = "Contractor: ";

const toContractor = (c: Counterparty): Contractor[] => {
  const m = c.meta as { kind?: string; corridor?: string; country?: string; bank?: string; last4?: string } | undefined;
  return m?.kind === "contractor" && m.corridor && isCorridor(m.corridor) && c.nickname?.startsWith(PREFIX)
    ? [{ id: c.id, name: c.nickname.slice(PREFIX.length), corridor: m.corridor, country: m.country ?? "", bank: m.bank ?? "", last4: m.last4 ?? "" }]
    : [];
};

/** Nuvion stores the contractor, so this app needs no database. `search` matches the nickname; `meta` is read back, not filtered. */
export async function listContractors(): Promise<Contractor[]> {
  const r = await nuvion<List<Counterparty>>("GET", `/counterparties?entity_id=${await entityId()}&search=Contractor&status=active&limit=100`);
  return r.data.flatMap(toContractor);
}

export interface NewContractor {
  firstName: string;
  lastName: string;
  email: string;
  line1: string;
  city: string;
  postcode: string;
  corridor: CorridorId;
  routing: Routing;
}

/**
 * Creates the counterparty, then its payment detail. Counterparties cannot be deleted, so if the second call fails
 * the first is deactivated, which keeps a contractor without bank details out of the list.
 * Shortcut: `state_or_province` reuses the city, because this example does not collect a region.
 */
export async function createContractor(n: NewContractor): Promise<Contractor> {
  const entity = await entityId();
  const country = CORRIDORS[n.corridor].country ?? n.routing.country!;
  const name = `${n.firstName} ${n.lastName}`;
  const bank = n.routing.bankName!.trim();
  const tail = last4(n.corridor, n.routing);
  const cp = await nuvion<Counterparty>("POST", "/counterparties", {
    type: "individual",
    entity_id: entity,
    nickname: `${PREFIX}${name}`,
    meta: { kind: "contractor", corridor: n.corridor, country, bank, last4: tail },
    profile: {
      first_name: n.firstName,
      last_name: n.lastName,
      relationship: "vendor",
      email: n.email,
      address: { line1: n.line1, city: n.city, state_or_province: n.city, postal_code: n.postcode, country },
    },
  });
  try {
    await nuvion<PaymentDetail>("POST", "/payment-details", {
      ...paymentDetailBody(n.corridor, n.routing),
      account_holder_name: name,
      entity_id: entity,
      counterparty_id: cp.id,
    });
  } catch (e) {
    await nuvion("POST", `/counterparties/${cp.id}/deactivate?entity_id=${entity}`).catch(() => undefined);
    throw e;
  }
  return { id: cp.id, name, corridor: n.corridor, country, bank, last4: tail };
}

/** The contractor's payment detail in the corridor's currency. Created once with the contractor, so the first match is the one. */
export async function paymentDetailFor(c: Contractor): Promise<string | null> {
  const r = await nuvion<List<PaymentDetail>>("GET", `/counterparties/${c.id}/payment-details?entity_id=${await entityId()}&limit=100`);
  return r.data.find((p) => p.payment_method === "bank-transfer" && p.currency === CORRIDORS[c.corridor].currency)?.id ?? null;
}

/** The contractor a pay-run row refers to: same name, corridor and last four digits, else a new one. Retrying a run therefore never creates a second contractor. */
export async function ensureContractor(n: NewContractor): Promise<Contractor> {
  const name = `${n.firstName} ${n.lastName}`;
  const tail = last4(n.corridor, n.routing);
  const found = (await listContractors()).find((c) => c.name === name && c.corridor === n.corridor && c.last4 === tail);
  return found ?? createContractor(n);
}
