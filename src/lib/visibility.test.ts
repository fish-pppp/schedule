import assert from "node:assert/strict";
import test from "node:test";

import {
  availabilityDuring,
  visibleEntries,
  type Outing,
  type PersonalBlock,
  type Rsvp,
} from "./visibility.ts";

const viewer = "viewer";
const friend = "friend";
const groupA = "group-a";
const groupB = "group-b";

const slotStart = new Date("2026-10-10T06:00:00.000Z");
const slotEnd = new Date("2026-10-10T09:00:00.000Z");

function block(overrides: Partial<PersonalBlock> = {}): PersonalBlock {
  return {
    id: "block-1",
    userId: friend,
    title: "加班",
    startAt: slotStart,
    endAt: slotEnd,
    hideTitle: false,
    ...overrides,
  };
}

function outing(overrides: Partial<Outing> = {}): Outing {
  return {
    id: "outing-1",
    groupId: groupA,
    title: "周五羽毛球",
    place: "市体育馆",
    startAt: slotStart,
    endAt: slotEnd,
    ...overrides,
  };
}

function rsvp(overrides: Partial<Rsvp> = {}): Rsvp {
  return {
    outingId: "outing-1",
    userId: friend,
    status: "going",
    ...overrides,
  };
}

test("the owner always sees a hidden personal title", () => {
  const entries = visibleEntries({
    viewerId: friend,
    contextGroupId: groupA,
    viewerGroupIds: [groupA],
    subjectUserId: friend,
    subjectInContextGroup: true,
    blocks: [block({ userId: friend, title: "面试", hideTitle: true })],
    outings: [],
    rsvps: [],
  });

  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.level, "detail");
  assert.equal(entries[0]?.title, "面试");
});

test("a group mate sees a personal title unless it is hidden", () => {
  const shared = {
    viewerId: viewer,
    contextGroupId: groupA,
    viewerGroupIds: [groupA],
    subjectUserId: friend,
    subjectInContextGroup: true,
    outings: [],
    rsvps: [],
  };

  const open = visibleEntries({ ...shared, blocks: [block()] });
  assert.equal(open[0]?.level, "detail");
  assert.equal(open[0]?.title, "加班");

  const hidden = visibleEntries({
    ...shared,
    blocks: [block({ title: "面试", hideTitle: true })],
  });
  assert.equal(hidden[0]?.level, "busy");
  assert.equal(hidden[0]?.title, null);
  assert.equal(JSON.stringify(hidden).includes("面试"), false);
});

test("the source group sees the outing, other groups only see busy or maybe", () => {
  const plan = outing();
  const base = {
    viewerId: viewer,
    viewerGroupIds: [groupA, groupB],
    subjectUserId: friend,
    subjectInContextGroup: true,
    blocks: [],
    outings: [plan],
  };

  const atHome = visibleEntries({
    ...base,
    contextGroupId: groupA,
    rsvps: [rsvp({ status: "going" })],
  });
  assert.equal(atHome[0]?.level, "detail");
  assert.equal(atHome[0]?.title, "周五羽毛球");
  assert.equal(atHome[0]?.place, "市体育馆");

  const elsewhere = visibleEntries({
    ...base,
    contextGroupId: groupB,
    viewerGroupIds: [groupB],
    rsvps: [rsvp({ status: "going" })],
  });
  assert.equal(elsewhere[0]?.level, "busy");
  assert.equal(elsewhere[0]?.title, null);
  assert.equal(elsewhere[0]?.place, null);
  assert.equal(JSON.stringify(elsewhere).includes("周五羽毛球"), false);
  assert.equal(JSON.stringify(elsewhere).includes("市体育馆"), false);

  const tentative = visibleEntries({
    ...base,
    contextGroupId: groupB,
    viewerGroupIds: [groupB],
    rsvps: [rsvp({ status: "maybe" })],
  });
  assert.equal(tentative[0]?.level, "maybe");
  assert.equal(tentative[0]?.title, null);
});

test("you still see your own outing details from another group", () => {
  const entries = visibleEntries({
    viewerId: friend,
    contextGroupId: groupB,
    viewerGroupIds: [groupB],
    subjectUserId: friend,
    subjectInContextGroup: true,
    blocks: [],
    outings: [outing()],
    rsvps: [rsvp({ userId: friend, status: "going" })],
  });

  assert.equal(entries[0]?.level, "detail");
  assert.equal(entries[0]?.title, "周五羽毛球");
  assert.equal(entries[0]?.place, "市体育馆");
  assert.equal(entries[0]?.groupId, groupA);
  assert.equal(JSON.stringify(entries).includes("周五羽毛球"), true);
});

test("declining or having no reply does not occupy you", () => {
  const declined = visibleEntries({
    viewerId: viewer,
    contextGroupId: groupB,
    viewerGroupIds: [groupB],
    subjectUserId: friend,
    subjectInContextGroup: true,
    blocks: [],
    outings: [outing()],
    rsvps: [rsvp({ status: "no" })],
  });
  assert.deepEqual(declined, []);

  const silent = visibleEntries({
    viewerId: viewer,
    contextGroupId: groupA,
    viewerGroupIds: [groupA],
    subjectUserId: friend,
    subjectInContextGroup: true,
    blocks: [],
    outings: [outing()],
    rsvps: [],
  });
  assert.deepEqual(silent, []);
});

test("people outside the group see nothing", () => {
  const stranger = visibleEntries({
    viewerId: viewer,
    contextGroupId: groupA,
    viewerGroupIds: [groupA],
    subjectUserId: friend,
    subjectInContextGroup: false,
    blocks: [block()],
    outings: [outing()],
    rsvps: [rsvp()],
  });
  assert.deepEqual(stranger, []);

  const outsider = visibleEntries({
    viewerId: viewer,
    contextGroupId: groupA,
    viewerGroupIds: [],
    subjectUserId: friend,
    subjectInContextGroup: true,
    blocks: [block()],
    outings: [],
    rsvps: [],
  });
  assert.deepEqual(outsider, []);
});

test("availability treats a hard conflict as busy and a maybe as maybe", () => {
  const hard = visibleEntries({
    viewerId: viewer,
    contextGroupId: groupB,
    viewerGroupIds: [groupB],
    subjectUserId: friend,
    subjectInContextGroup: true,
    blocks: [block({ hideTitle: true })],
    outings: [outing()],
    rsvps: [rsvp({ status: "maybe" })],
  });
  assert.equal(availabilityDuring(hard, slotStart, slotEnd), "busy");

  const soft = visibleEntries({
    viewerId: viewer,
    contextGroupId: groupB,
    viewerGroupIds: [groupB],
    subjectUserId: friend,
    subjectInContextGroup: true,
    blocks: [],
    outings: [outing()],
    rsvps: [rsvp({ status: "maybe" })],
  });
  assert.equal(availabilityDuring(soft, slotStart, slotEnd), "maybe");
  assert.equal(
    availabilityDuring(soft, new Date("2026-10-10T09:00:00.000Z"), new Date("2026-10-10T10:00:00.000Z")),
    "free",
  );
});

test("your own detailed outing still counts as busy", () => {
  const entries = visibleEntries({
    viewerId: friend,
    contextGroupId: groupB,
    viewerGroupIds: [groupB],
    subjectUserId: friend,
    subjectInContextGroup: true,
    blocks: [],
    outings: [outing()],
    rsvps: [rsvp({ userId: friend, status: "going" })],
  });
  assert.equal(entries[0]?.level, "detail");
  assert.equal(availabilityDuring(entries, slotStart, slotEnd), "busy");
});
