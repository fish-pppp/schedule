import Link from "next/link";

import { MobileWeek } from "@/components/mobile-week";
import { EntryChip, entriesOnDay, weekdayLabel, type WeekMember } from "@/components/week-entry";
import { currentShanghaiYmd, formatDay } from "@/lib/time";

export function WeekBoard({
  groupId,
  color,
  days,
  members,
  viewerId,
}: {
  groupId: string;
  color: string;
  days: string[];
  viewerId: string;
  members: WeekMember[];
}) {
  const today = currentShanghaiYmd();

  return (
    <>
      <MobileWeek
        key={days[0] ?? "week"}
        groupId={groupId}
        color={color}
        days={days}
        members={members}
        viewerId={viewerId}
        today={today}
      />
      <div className="hidden max-w-full rounded-2xl border border-line md:block">
        <table className="week-table">
          <caption className="sr-only">本周每位成员的空闲和占用</caption>
          <thead>
            <tr>
              <th scope="col">成员</th>
              {days.map((day) => (
                <th key={day} scope="col">
                  <Link
                    href={`/groups/${groupId}/outings/new?date=${day}`}
                    title={`约 ${formatDay(day)}`}
                    className="block"
                  >
                    <span className="lg:hidden">
                      {Number(day.slice(5, 7))}/{Number(day.slice(8, 10))}
                      <span className="mt-0.5 block font-normal text-muted">{weekdayLabel(day)}</span>
                    </span>
                    <span className="hidden lg:inline">{formatDay(day)}</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.userId}>
                <th scope="row">
                  {member.name}
                  {member.userId === viewerId ? (
                    <span className="mt-1 block text-xs font-normal text-muted">我</span>
                  ) : null}
                </th>
                {days.map((day) => {
                  const entries = entriesOnDay(member.entries, day);
                  return (
                    <td key={day}>
                      {entries.length === 0 ? <span className="text-xs text-muted">空闲</span> : null}
                      <div className="flex flex-col gap-1">
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
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
