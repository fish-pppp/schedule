"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { DayChart } from "@/components/day-chart";
import { WeekBoard } from "@/components/week-board";
import type { DayMember } from "@/lib/day-timeline";
import { dayViewHref, groupWeekHref } from "@/lib/paths";
import { isYmd } from "@/lib/time";
import type { VisibleEntry } from "@/lib/visibility";

export type GroupWeekEntry = Omit<VisibleEntry, "startAt" | "endAt"> & {
  startAt: string;
  endAt: string;
};

export type GroupWeekMember = {
  userId: string;
  name: string;
  color: string;
  entries: GroupWeekEntry[];
};

function hydrate(members: GroupWeekMember[]): DayMember[] {
  return members.map((member) => ({
    userId: member.userId,
    name: member.name,
    color: member.color,
    entries: member.entries.map((entry) => ({
      ...entry,
      startAt: new Date(entry.startAt),
      endAt: new Date(entry.endAt),
    })),
  }));
}

export function GroupWeek({
  groupId,
  color,
  days,
  members,
  viewerId,
}: {
  groupId: string;
  color: string;
  days: string[];
  members: GroupWeekMember[];
  viewerId: string;
}) {
  const searchParams = useSearchParams();
  const week = searchParams.get("week");
  const validWeek = week && isYmd(week) ? week : undefined;
  const day = searchParams.get("day");
  const selected = day && days.includes(day) ? day : undefined;
  const hydrated = hydrate(members);
  const shouldFocus = useRef(false);

  useEffect(() => {
    if (!selected || !shouldFocus.current) return;
    shouldFocus.current = false;
    document.getElementById("day-chart")?.scrollIntoView({ block: "start" });
    document.getElementById("day-chart-title")?.focus();
  }, [selected]);

  function showDay(next: string) {
    const closing = next === selected;
    shouldFocus.current = !closing;
    const href = closing ? groupWeekHref(groupId, validWeek) : dayViewHref(groupId, next, validWeek);
    window.history.pushState(null, "", href);
    if (closing) {
      requestAnimationFrame(() => document.getElementById(`week-day-${next}`)?.focus());
    }
  }

  return (
    <div className="space-y-3">
      {selected ? (
        <DayChart
          day={selected}
          groupId={groupId}
          members={hydrated}
          closeHref={groupWeekHref(groupId, validWeek)}
          onClose={() => showDay(selected)}
        />
      ) : null}
      <WeekBoard
        groupId={groupId}
        color={color}
        days={days}
        members={hydrated}
        viewerId={viewerId}
        selectedDay={selected}
        dayHref={(next) => dayViewHref(groupId, next, validWeek)}
        onSelectDay={showDay}
      />
    </div>
  );
}
