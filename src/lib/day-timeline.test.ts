import assert from "node:assert/strict";
import test from "node:test";

import { buildDaySlices, describeDayEntry, layoutDayBands, type DayMember } from "./day-timeline.ts";
import type { VisibleEntry } from "./visibility.ts";

const day = "2026-10-10";

function at(value: string): Date {
  return new Date(`${value}+08:00`);
}

function entry(overrides: Partial<VisibleEntry> & { start: string; end: string }): VisibleEntry {
  return {
    id: overrides.id ?? "entry-1",
    userId: overrides.userId ?? "user-a",
    startAt: at(overrides.start),
    endAt: at(overrides.end),
    source: overrides.source ?? "personal",
    level: overrides.level ?? "detail",
    title: overrides.title === undefined ? "打球" : overrides.title,
    place: overrides.place ?? null,
    status: overrides.status ?? null,
    groupId: overrides.groupId ?? null,
  };
}

function member(overrides: Partial<DayMember> & { userId: string; entries: VisibleEntry[] }): DayMember {
  return {
    userId: overrides.userId,
    name: overrides.name ?? overrides.userId,
    color: overrides.color ?? "#111111",
    entries: overrides.entries,
  };
}

test("overlapping people share one slice, in member order", () => {
  const slices = buildDaySlices(
    day,
    [
      member({
        userId: "a",
        name: "小明",
        color: "#c6533a",
        entries: [entry({ id: "a", userId: "a", start: "2026-10-10T10:00:00", end: "2026-10-10T14:00:00" })],
      }),
      member({
        userId: "b",
        name: "小红",
        color: "#1f6f68",
        entries: [entry({ id: "b", userId: "b", start: "2026-10-10T12:00:00", end: "2026-10-10T16:00:00", level: "busy", title: null })],
      }),
    ],
    "group-1",
  );

  assert.equal(slices.length, 3);
  assert.ok(Math.abs(slices[0]!.startRatio - 10 / 24) < 1e-9);
  assert.ok(Math.abs(slices[0]!.endRatio - 12 / 24) < 1e-9);
  assert.deepEqual(slices[0]!.people.map((person) => person.userId), ["a"]);
  assert.deepEqual(slices[1]!.people.map((person) => person.color), ["#c6533a", "#1f6f68"]);
  assert.equal(slices[1]!.people[1]!.label, "忙碌");
  assert.deepEqual(slices[2]!.people.map((person) => person.userId), ["b"]);

  const { bands, laneCount } = layoutDayBands(
    day,
    [
      member({
        userId: "a",
        name: "小明",
        color: "#c6533a",
        entries: [entry({ id: "a", userId: "a", start: "2026-10-10T10:00:00", end: "2026-10-10T14:00:00" })],
      }),
      member({
        userId: "b",
        name: "小红",
        color: "#1f6f68",
        entries: [entry({ id: "b", userId: "b", start: "2026-10-10T12:00:00", end: "2026-10-10T16:00:00", level: "busy", title: null })],
      }),
    ],
    "group-1",
  );
  assert.equal(laneCount, 2);
  assert.equal(bands.filter((band) => band.userId === "a").length, 1);
  assert.ok(Math.abs((bands.find((band) => band.userId === "a")?.endRatio ?? 0) - 14 / 24) < 1e-9);
  assert.deepEqual(
    bands.map((band) => band.lane),
    bands.map((band) => (band.userId === "a" ? 0 : 1)),
  );
});

test("entries clip to the selected day", () => {
  const fromYesterday = describeDayEntry(
    day,
    entry({ start: "2026-10-09T22:00:00", end: "2026-10-10T02:00:00" }),
    "group-1",
  );
  assert.equal(fromYesterday.timeLabel, "00:00–02:00（从前一天）");

  const intoTomorrow = describeDayEntry(
    day,
    entry({ start: "2026-10-10T22:00:00", end: "2026-10-11T03:00:00" }),
    "group-1",
  );
  assert.equal(intoTomorrow.timeLabel, "22:00–24:00（到后一天）");

  const across = describeDayEntry(
    day,
    entry({ start: "2026-10-09T12:00:00", end: "2026-10-11T12:00:00" }),
    "group-1",
  );
  assert.equal(across.timeLabel, "00:00–24:00（跨天）");

  const untilMidnight = describeDayEntry(
    day,
    entry({ start: "2026-10-10T10:00:00", end: "2026-10-11T00:00:00" }),
    "group-1",
  );
  assert.equal(untilMidnight.timeLabel, "10:00–24:00");

  const slices = buildDaySlices(
    day,
    [member({ userId: "a", entries: [entry({ start: "2026-10-09T22:00:00", end: "2026-10-10T02:00:00" })] })],
    "group-1",
  );
  assert.equal(slices.length, 1);
  assert.equal(slices[0]!.startRatio, 0);
  assert.ok(Math.abs(slices[0]!.endRatio - 2 / 24) < 1e-9);
});

test("two plans for one person stay a single color", () => {
  const slices = buildDaySlices(
    day,
    [
      member({
        userId: "a",
        name: "小红",
        color: "#1f6f68",
        entries: [
          entry({
            id: "dentist",
            userId: "a",
            start: "2026-10-10T11:00:00",
            end: "2026-10-10T14:00:00",
            title: "看牙",
          }),
          entry({
            id: "ball",
            userId: "a",
            source: "outing",
            start: "2026-10-10T13:00:00",
            end: "2026-10-10T17:00:00",
            title: "打球",
            place: "公园",
            status: "maybe",
            groupId: "group-1",
          }),
        ],
      }),
    ],
    "group-1",
  );

  const overlap = slices.find((slice) => Math.abs(slice.startRatio - 13 / 24) < 1e-9);
  assert.ok(overlap);
  assert.equal(overlap.people.length, 1);
  assert.equal(overlap.people[0]?.uncertain, false);
  assert.match(overlap.people[0]?.detail ?? "", /看牙/);
  assert.match(overlap.people[0]?.detail ?? "", /可能参加/);

  const later = slices.find((slice) => Math.abs(slice.startRatio - 14 / 24) < 1e-9);
  assert.equal(later?.people.length, 1);
  assert.equal(later?.people[0]?.uncertain, true);
});

test("a day with no overlap stays empty, and maybe stays striped", () => {
  assert.deepEqual(
    buildDaySlices(
      day,
      [member({ userId: "a", entries: [entry({ start: "2026-10-11T01:00:00", end: "2026-10-11T02:00:00" })] })],
      "group-1",
    ),
    [],
  );
  assert.deepEqual(buildDaySlices("not-a-day", [], "group-1"), []);

  const maybe = describeDayEntry(
    day,
    entry({
      start: "2026-10-10T09:00:00",
      end: "2026-10-10T12:00:00",
      source: "outing",
      level: "detail",
      title: "打球",
      place: "公园",
      status: "maybe",
      groupId: "other-group",
    }),
    "group-1",
  );
  assert.equal(maybe.uncertain, true);
  assert.equal(maybe.label, "打球");
  assert.equal(maybe.detail, "09:00–12:00 · 打球 · 公园 · 可能参加 · 其他搭子组");

  const hidden = describeDayEntry(
    day,
    entry({ start: "2026-10-10T09:00:00", end: "2026-10-10T11:00:00", level: "maybe", title: null }),
    "group-1",
  );
  assert.equal(hidden.detail, "09:00–11:00 · 可能忙");
  assert.equal(hidden.uncertain, true);
});
