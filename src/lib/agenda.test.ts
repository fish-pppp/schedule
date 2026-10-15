import assert from "node:assert/strict";
import test from "node:test";

import { buildAgenda, type AgendaBlock, type AgendaOuting, type AgendaRsvp } from "./agenda.ts";

const viewer = "me";
const friend = "friend";
const stranger = "stranger";
const groupA = "group-a";
const groupB = "group-b";
const today = "2026-10-15";
const now = new Date("2026-10-15T00:00:00.000Z");

function at(ymd: string, time: string) {
  return new Date(`${ymd}T${time}:00+08:00`);
}

const groups = [{ id: groupA, name: "羽毛球", color: "#c6533a" }];
const people = [
  { userId: viewer, name: "我", groupIds: [groupA] },
  { userId: friend, name: "小王", groupIds: [groupA, groupB] },
  { userId: stranger, name: "路人", groupIds: ["other"] },
];

function run(partial: {
  blocks?: AgendaBlock[];
  outings?: AgendaOuting[];
  rsvps?: AgendaRsvp[];
}) {
  return buildAgenda({
    viewerId: viewer,
    now,
    today,
    groups,
    people,
    blocks: partial.blocks ?? [],
    outings: partial.outings ?? [],
    rsvps: partial.rsvps ?? [],
  });
}

test("groups my blocks and shared outings by day, skipping empty days", () => {
  const days = run({
    blocks: [
      {
        id: "block-1",
        userId: viewer,
        title: "搬家",
        startAt: at(today, "09:00"),
        endAt: at(today, "11:00"),
        hideTitle: false,
      },
    ],
    outings: [
      {
        id: "outing-1",
        groupId: groupA,
        title: "打球",
        place: "体育馆",
        startAt: at("2026-10-16", "14:00"),
        endAt: at("2026-10-16", "17:00"),
      },
    ],
    rsvps: [{ outingId: "outing-1", userId: viewer, status: "going" }],
  });

  assert.deepEqual(
    days.map((day) => day.ymd),
    [today, "2026-10-16"],
  );
  assert.equal(days[0]?.title, "今天");
  assert.equal(days[0]?.mine[0]?.title, "搬家");
  assert.equal(days[0]?.mine[0]?.meta, "占用");
  assert.equal(days[1]?.title, "明天");
  assert.equal(days[1]?.mine[0]?.meta, "羽毛球");
  assert.equal(days[1]?.mine[0]?.place, "体育馆");
  assert.equal(days[1]?.mine[0]?.href, "/groups/group-a/outings");
});

test("shows a group mate's title only inside a shared group", () => {
  const days = run({
    outings: [
      {
        id: "ours",
        groupId: groupA,
        title: "打球",
        place: "体育馆",
        startAt: at(today, "14:00"),
        endAt: at(today, "16:00"),
      },
      {
        id: "theirs",
        groupId: groupB,
        title: "秘密局",
        place: "某处",
        startAt: at(today, "18:00"),
        endAt: at(today, "20:00"),
      },
    ],
    rsvps: [
      { outingId: "ours", userId: friend, status: "going" },
      { outingId: "theirs", userId: friend, status: "maybe" },
    ],
    blocks: [
      {
        id: "hidden",
        userId: friend,
        title: "面试",
        startAt: at(today, "09:00"),
        endAt: at(today, "10:00"),
        hideTitle: true,
      },
      {
        id: "open",
        userId: friend,
        title: "加班",
        startAt: at(today, "10:00"),
        endAt: at(today, "12:00"),
        hideTitle: false,
      },
    ],
  });

  const others = days[0]?.others ?? [];
  assert.deepEqual(
    others.map((item) => item.label),
    ["忙碌", "加班", "打球", "可能忙"],
  );
  assert.equal(others.find((item) => item.label === "打球")?.place, "体育馆");
  assert.equal(others.find((item) => item.label === "打球")?.href, "/groups/group-a/outings");
  assert.equal(others.find((item) => item.label === "可能忙")?.place, null);
  assert.equal(others.find((item) => item.label === "可能忙")?.href, null);
});

test("hides pending invites and people outside every shared group", () => {
  const days = run({
    outings: [
      {
        id: "wait",
        groupId: groupA,
        title: "还没定",
        place: null,
        startAt: at(today, "14:00"),
        endAt: at(today, "15:00"),
      },
      {
        id: "stranger-plan",
        groupId: "other",
        title: "路人的局",
        place: null,
        startAt: at(today, "14:00"),
        endAt: at(today, "15:00"),
      },
    ],
    rsvps: [
      { outingId: "wait", userId: viewer, status: "going" },
      { outingId: "wait", userId: friend, status: "invited" },
      { outingId: "stranger-plan", userId: stranger, status: "going" },
    ],
    blocks: [
      {
        id: "stranger-block",
        userId: stranger,
        title: "路人占用",
        startAt: at(today, "09:00"),
        endAt: at(today, "10:00"),
        hideTitle: false,
      },
    ],
  });

  assert.equal(days.length, 0);
});

test("a calendar window still shows days that already passed", () => {
  const days = buildAgenda({
    viewerId: viewer,
    now,
    today,
    from: "2026-10-01",
    until: "2026-11-01",
    groups,
    people,
    blocks: [
      {
        id: "earlier",
        userId: viewer,
        title: "已过去",
        startAt: at("2026-10-02", "09:00"),
        endAt: at("2026-10-02", "10:00"),
        hideTitle: false,
      },
    ],
    outings: [],
    rsvps: [],
  });

  assert.equal(days[0]?.ymd, "2026-10-02");
  assert.equal(days[0]?.mine[0]?.title, "已过去");
});

test("a multi-day outing shows on each remaining day", () => {
  const days = run({
    outings: [
      {
        id: "trip",
        groupId: groupA,
        title: "出游",
        place: null,
        startAt: at("2026-10-14", "22:00"),
        endAt: at("2026-10-16", "02:00"),
      },
    ],
    rsvps: [{ outingId: "trip", userId: viewer, status: "maybe" }],
  });

  assert.deepEqual(
    days.map((day) => [day.ymd, day.mine[0]?.when, day.mine[0]?.meta]),
    [
      [today, "全天", "羽毛球 · 可能"],
      ["2026-10-16", "到 02:00", "羽毛球 · 可能"],
    ],
  );
});
