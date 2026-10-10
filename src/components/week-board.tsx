import Link from "next/link";

import { deleteBlock } from "@/server/block-actions";
import { dayBounds, formatClock, formatDay, shanghaiYmd } from "@/lib/time";
import { overlaps, type VisibleEntry } from "@/lib/visibility";

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
  members: { userId: string; name: string; entries: VisibleEntry[] }[];
}) {
  return (
    <div className="week-scroll rounded-2xl border border-line">
      <table className="week-table">
        <caption className="sr-only">本周每位成员的空闲和占用</caption>
        <thead>
          <tr>
            <th scope="col">成员</th>
            {days.map((day) => (
              <th key={day} scope="col">
                <Link href={`/groups/${groupId}/outings/new?date=${day}`} title={`约 ${formatDay(day)}`}>
                  {formatDay(day)}
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
                {member.userId === viewerId ? <span className="mt-1 block text-xs font-normal text-muted">我</span> : null}
              </th>
              {days.map((day) => {
                const bounds = dayBounds(day);
                const entries = member.entries.filter((entry) =>
                  overlaps(entry.startAt, entry.endAt, bounds.start, bounds.end),
                );
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
  );
}

function EntryChip({
  entry,
  groupId,
  color,
  viewerId,
}: {
  entry: VisibleEntry;
  groupId: string;
  color: string;
  viewerId: string;
}) {
  const label = entry.level === "busy" ? "忙碌" : entry.level === "maybe" ? "可能忙" : (entry.title ?? "忙碌");
  const otherGroup = entry.source === "outing" && entry.groupId !== groupId;
  const className =
    entry.level === "busy"
      ? "rounded-lg bg-ink px-2 py-1 text-xs text-white"
      : entry.level === "maybe"
        ? "rounded-lg border border-dashed border-maybe px-2 py-1 text-xs text-maybe"
        : entry.source === "personal"
          ? "rounded-lg bg-[#efe8dc] px-2 py-1 text-xs"
          : "rounded-lg border-l-4 bg-paper px-2 py-1 text-xs";

  return (
    <div
      className={className}
      style={
        entry.level === "detail" && entry.source === "outing"
          ? { borderLeftColor: otherGroup ? "#6d645c" : color }
          : undefined
      }
    >
      <p className="font-medium">{label}</p>
      {entry.level === "detail" && entry.place ? <p>{entry.place}</p> : null}
      {entry.level === "detail" && entry.status === "maybe" ? <p>可能参加</p> : null}
      {entry.level === "detail" && otherGroup ? <p className="text-muted">其他搭子组</p> : null}
      <p className={`tabular-nums ${entry.level === "busy" ? "opacity-80" : "text-muted"}`}>{clockRange(entry)}</p>
      {entry.source === "personal" && entry.userId === viewerId ? (
        <form action={deleteBlock}>
          <input type="hidden" name="id" value={entry.id} />
          <button type="submit" className="mt-1 underline">
            删除
          </button>
        </form>
      ) : null}
    </div>
  );
}

function clockRange(entry: VisibleEntry): string {
  const startDay = shanghaiYmd(entry.startAt);
  const endDay = shanghaiYmd(entry.endAt);
  if (startDay === endDay) return `${formatClock(entry.startAt)}–${formatClock(entry.endAt)}`;
  return `${formatClock(entry.startAt)}–${formatClock(entry.endAt)}`;
}
