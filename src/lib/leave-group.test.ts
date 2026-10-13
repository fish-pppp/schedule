import assert from "node:assert/strict";
import test from "node:test";

import { planLeave } from "./leave-group.ts";

const owner = { userId: "a", role: "owner" };
const early = { userId: "b", role: "member" };
const later = { userId: "c", role: "member" };

test("someone who is not a member cannot leave", () => {
  assert.deepEqual(planLeave([owner, early], "z"), { kind: "missing" });
});

test("the last member dissolves the group", () => {
  assert.deepEqual(planLeave([owner], "a"), { kind: "dissolve" });
});

test("a member leaves without changing the owner", () => {
  assert.deepEqual(planLeave([owner, early, later], "c"), { kind: "leave", nextOwnerId: null });
});

test("an owner hands the group to whoever joined first", () => {
  assert.deepEqual(planLeave([owner, early, later], "a"), { kind: "leave", nextOwnerId: "b" });
});
