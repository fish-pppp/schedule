import { deleteBlock } from "@/server/block-actions";
import { dayBounds, formatClock, formatDay } from "@/lib/time";
import { overlaps, type VisibleEntry } from "@/lib/visibility";

export type WeekMember = {
  userId: string;
  name: string;
  entries: VisibleEntry[];
};

export function weekdayLabel(ymd: string): string {
  const label = formatDay(ymd);
  const space = label.lastIndexOf(" ");
  return space >= 0 ? label.slice(space + 1) : label;
}

export function entriesOnDay(entries: readonly VisibleEntry[], day: string): VisibleEntry[] {
  const bounds = dayBounds(day);
  return entries.filter((entry) => overlaps(entry.startAt, entry.endAt, bounds.start, bounds.end));
}

export function EntryChip({
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
      <p className={`tabular-nums ${entry.level === "busy" ? "opacity-80" : "text-muted"}`}>
        <ClockRange entry={entry} />
      </p>
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

function ClockRange({ entry }: { entry: VisibleEntry }) {
  return (
    <>
      <span className="inline-block">{formatClock(entry.startAt)}</span>
      <span className="inline-block">–{formatClock(entry.endAt)}</span>
    </>
  );
}
