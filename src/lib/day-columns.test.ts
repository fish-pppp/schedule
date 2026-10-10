import assert from "node:assert/strict";
import test from "node:test";

import { buildDayColumns, type SliceEntry, type SliceMember } from "./day-columns.ts";

const day = "2026-10-10";

function at(value: string): Date {
  return new Date(`${value}+08:00`);
}

function entry(start: string, end: string, overrides: Partial<SliceEntry> = {}): SliceEntry {
  return {
    level: overrides.level ?? "detail",
    title: overrides.title === undefined ? "打球" : overrides.title,
    place: overrides.place ?? null,
    startAt: at(start),
    endAt: at(end),
    status: overrides.status ?? null,
  };
}

function member(userId: string, name: string, color: string, entries: SliceEntry[]): SliceMember {
  return { userId, name, color, entries };
}

test("people who overlap share one row, each keeping their own stretch", () => {
  const columns = buildDayColumns(day, [
    member("a", "小明", "#c6533a", [entry("2026-10-10T10:00:00", "2026-10-10T14:00:00")]),
    member("b", "小红", "#1f6f68", [
      entry("2026-10-10T12:00:00", "2026-10-10T16:00:00", {
        title: "公园散步",
        place: "朝阳公园",
        status: "maybe",
        level: "detail",
      }),
    ]),
  ]);

  assert.equal(columns.length, 3);
  assert.deepEqual(columns[0]?.people.map((person) => person.userId), ["a"]);
  assert.ok(Math.abs((columns[0]?.startRatio ?? 0) - 10 / 24) < 1e-9);
  assert.ok(Math.abs((columns[0]?.endRatio ?? 0) - 12 / 24) < 1e-9);
  assert.deepEqual(columns[1]?.people.map((person) => [person.userId, person.color]), [
    ["a", "#c6533a"],
    ["b", "#1f6f68"],
  ]);
  assert.equal(columns[1]?.people[1]?.uncertain, true);
  assert.equal(columns[1]?.people[1]?.notes, "朝阳公园 · 可能参加");
  assert.deepEqual(columns[2]?.people.map((person) => person.userId), ["b"]);
  assert.ok(Math.abs((columns[2]?.endRatio ?? 0) - 16 / 24) < 1e-9);
});

test("a gap between one person's plans splits the row", () => {
  const columns = buildDayColumns(day, [
    member("a", "小明", "#c6533a", [
      entry("2026-10-10T10:00:00", "2026-10-10T12:00:00", { title: "打球" }),
      entry("2026-10-10T13:00:00", "2026-10-10T15:00:00", { title: "开会" }),
    ]),
    member("b", "小红", "#1f6f68", [entry("2026-10-10T12:00:00", "2026-10-10T16:00:00", { title: "散步" })]),
  ]);

  assert.deepEqual(
    columns.map((column) => column.people.map((person) => person.userId)),
    [["a"], ["b"], ["a", "b"], ["b"]],
  );
  assert.equal(columns[2]?.people[0]?.label, "开会");
});

test("an empty day has no rows", () => {
  assert.deepEqual(buildDayColumns(day, [member("a", "小明", "#c6533a", [])]), []);
  assert.deepEqual(buildDayColumns("nope", []), []);
});
