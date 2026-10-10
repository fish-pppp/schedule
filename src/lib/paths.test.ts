import assert from "node:assert/strict";
import test from "node:test";

import { safeNext } from "./paths.ts";

test("safeNext only keeps in-app paths", () => {
  assert.equal(safeNext("/groups/abc?week=2026-10-05"), "/groups/abc?week=2026-10-05");
  assert.equal(safeNext("https://evil.example"), "/");
  assert.equal(safeNext("//evil.example"), "/");
  assert.equal(safeNext(null), "/");
});
