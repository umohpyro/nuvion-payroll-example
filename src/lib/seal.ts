// Seals a visitor's Nuvion settings with AES-256-GCM, so the browser cookie holds ciphertext, not their API key.
// Pure Web Crypto, so it can be unit tested without Next.js.
const enc = new TextEncoder();
const dec = new TextDecoder();

async function keyFor(secret: string) {
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

const toText = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");

export async function seal(secret: string, data: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await keyFor(secret), enc.encode(JSON.stringify(data))));
  return `${toText(iv)}.${toText(cipher)}`;
}

/** Returns the sealed value, or null if the token is malformed, tampered with, or sealed with another secret. */
export async function open<T>(secret: string, token: string): Promise<T | null> {
  try {
    const [iv, cipher] = token.split(".");
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(iv, "base64url") }, await keyFor(secret), Buffer.from(cipher, "base64url"));
    return JSON.parse(dec.decode(plain)) as T;
  } catch {
    return null;
  }
}

/** Name of the cookie that holds the sealed settings. Lives here so the proxy can read it without server-only code. */
export const SESSION_COOKIE = "payroll_session";
