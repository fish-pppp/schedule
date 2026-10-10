import assert from "node:assert/strict";
import test from "node:test";

import { pendingOutingIds } from "./invite.ts";

test("an outing stays pending while anyone is still invited", () => {
  const pending = pendingOutingIds([
    { outingId: "a", status: "going" },
    { outingId: "a", status: "invited" },
    { outingId: "b", status: "going" },
    { outingId: "b", status: "no" },
  ]);
  assert.deepEqual([...pending], ["a"]);
});
