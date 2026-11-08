import assert from "node:assert/strict";
import { test } from "node:test";
import { open, seal } from "./seal.ts";

test("a sealed value opens with the same secret", async () => {
  const token = await seal("secret-one", { apiKey: "nv_test_abc", entityId: "01ABC" });
  assert.deepEqual(await open("secret-one", token), { apiKey: "nv_test_abc", entityId: "01ABC" });
});

test("the token does not contain the plain text", async () => {
  const token = await seal("secret-one", { apiKey: "nv_test_abc" });
  assert.ok(!token.includes("nv_test_abc"));
});

test("a different secret, a tampered token or garbage opens to null", async () => {
  const token = await seal("secret-one", { a: 1 });
  assert.equal(await open("secret-two", token), null);
  const [iv, cipher] = token.split(".");
  assert.equal(await open("secret-one", `${iv}.${cipher.slice(0, -2)}AA`), null);
  assert.equal(await open("secret-one", "not-a-token"), null);
});

test("two seals of the same value differ", async () => {
  assert.notEqual(await seal("s", { a: 1 }), await seal("s", { a: 1 }));
});
