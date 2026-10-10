"use client";

import Link from "next/link";
import { useState, type KeyboardEvent } from "react";

import { EntryChip, entriesOnDay, weekdayLabel, type WeekMember } from "@/components/week-entry";
import { formatDay } from "@/lib/time";
import { secondaryButtonClass } from "@/lib/ui";

export function MobileWeek({
  groupId,
  color,
  days,
  members,
  viewerId,
  today,
}: {
  groupId: string;
  color: string;
  days: string[];
  members: WeekMember[];
  viewerId: string;
  today: string;
}) {
  const fallback = days.includes(today) ? today : (days[0] ?? today);
  const [selected, setSelected] = useState(fallback);
  const active = days.includes(selected) ? selected : fallback;

  if (days.length === 0) return null;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = days.indexOf(active);
    if (index < 0) return;
    const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (direction === 0) return;
    event.preventDefault();
    const next = days[(index + direction + days.length) % days.length];
    if (!next) return;
    setSelected(next);
    document.getElementById(tabId(groupId, next))?.focus();
  }

  return (
    <div className="space-y-3 md:hidden">
      <div
        role="tablist"
        aria-label="选择日期"
        className="grid grid-cols-7 gap-1 rounded-2xl border border-line bg-card p-1"
        onKeyDown={onKeyDown}
      >
        {days.map((day) => {
          const isSelected = day === active;
          return (
            <button
              key={day}
              id={tabId(groupId, day)}
              type="button"
              role="tab"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              className={tabClass(isSelected, day === today)}
              onClick={() => setSelected(day)}
            >
              <span className="text-[11px] leading-4">{weekdayLabel(day)}</span>
              <span className="text-sm font-medium tabular-nums leading-5">{Number(day.slice(8, 10))}</span>
            </button>
          );
        })}
      </div>

      <section role="tabpanel" aria-labelledby={tabId(groupId, active)} className="rounded-2xl border border-line bg-card px-4">
        <div className="flex items-center justify-between gap-3 border-b border-line py-3">
          <h3 className="min-w-0 text-sm font-medium">{formatDay(active)}</h3>
          <Link href={`/groups/${groupId}/outings/new?date=${active}`} className={`${secondaryButtonClass} shrink-0`}>
            约这天
          </Link>
        </div>
        <ul>
          {members.map((member) => {
            const entries = entriesOnDay(member.entries, active);
            return (
              <li key={member.userId} className="border-b border-line py-3 last:border-b-0">
                <p className="break-words text-sm font-medium">
                  {member.name}
                  {member.userId === viewerId ? (
                    <span className="ml-2 text-xs font-normal text-muted">我</span>
                  ) : null}
                </p>
                {entries.length === 0 ? (
                  <p className="mt-1 text-xs text-muted">空闲</p>
                ) : (
                  <div className="mt-2 flex flex-col gap-1">
                    {entries.map((entry) => (
                      <EntryChip
                        key={`${entry.source}-${entry.id}`}
                        entry={entry}
                        groupId={groupId}
                        color={color}
                        viewerId={viewerId}
                      />
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function tabId(groupId: string, day: string): string {
  return `week-${groupId}-${day}`;
}

function tabClass(selected: boolean, isToday: boolean): string {
  const tone = selected ? "bg-ink text-white" : isToday ? "text-accent" : "text-ink";
  return `flex min-w-0 flex-col items-center rounded-xl px-0.5 py-2 text-center ${tone}`;
}
