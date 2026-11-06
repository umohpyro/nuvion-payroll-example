/** Nuvion amounts are integers in the smallest unit with 2 decimal places, stablecoins included: 1250 is 12.50. */
const STABLECOINS: Record<string, string> = { USC: "USDC", UST: "USDT", RLD: "RLUSD" };

export const isStablecoin = (currency: string) => currency in STABLECOINS;
/** Nuvion currency code to the ticker people know: USC is USDC. */
export const ticker = (currency: string) => STABLECOINS[currency] ?? currency;

export function formatAmount(minor: number, currency: string): string {
  if (isStablecoin(currency)) return `${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${ticker(currency)}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
}

/** Parses "12.5" into 1250. Returns null for anything that isn't a positive amount with at most 2 decimals. */
export function parseAmount(input: string): number | null {
  const m = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!m) return null;
  const minor = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return minor > 0 ? minor : null;
}

/** 1250 becomes "12.50": the form that parseAmount reads back. */
export const toDecimal = (minor: number) => (minor / 100).toFixed(2);

export const formatDate = (ms: number) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(ms);
