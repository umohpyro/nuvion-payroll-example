import assert from "node:assert/strict";
import { test } from "node:test";
import { limited } from "./ratelimit.ts";

test("allows up to the limit, then blocks until the window ends", () => {
  const t = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(limited("a", 3, 60_000, t), 0);
  assert.equal(limited("a", 3, 60_000, t), 60);
  assert.equal(limited("b", 3, 60_000, t), 0);
  assert.equal(limited("a", 3, 60_000, t + 60_000), 0);
});
