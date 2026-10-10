import Link from "next/link";

import { describeDayEntry, layoutDayBands, type DayMember } from "@/lib/day-timeline";
import { dayBounds, formatDay } from "@/lib/time";
import { buttonClass, cardClass, secondaryButtonClass } from "@/lib/ui";
import { overlaps } from "@/lib/visibility";

const HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24] as const;

export function DayChart({
  day,
  groupId,
  members,
  closeHref,
  onClose,
}: {
  day: string;
  groupId: string;
  members: DayMember[];
  closeHref: string;
  onClose: () => void;
}) {
  const bounds = dayBounds(day);
  const { bands, laneCount } = layoutDayBands(day, members, groupId);
  const trackHeight = laneCount === 0 ? 52 : laneCount * 28 + 4;

  return (
    <section id="day-chart" aria-labelledby="day-chart-title" className={`${cardClass} scroll-mt-24 space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="day-chart-title" tabIndex={-1} className="text-lg font-semibold" style={{ outline: "none" }}>
            {formatDay(day)}
          </h3>
          <p className="mt-1 text-sm text-muted">每个人一种颜色，同一时间叠在这一行里。斜线是可能忙，空着是空闲。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={closeHref}
            className={secondaryButtonClass}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              onClose();
            }}
          >
            收起
          </a>
          <Link href={`/groups/${groupId}/outings/new?date=${day}`} className={buttonClass}>
            约这一天
          </Link>
        </div>
      </div>

      <div className="day-scroll" aria-hidden="true">
        <div className="day-chart">
          <div className="relative mb-1 h-4 text-[11px] tabular-nums text-muted">
            {HOURS.map((hour) => (
              <span
                key={hour}
                className="absolute top-0"
                style={{
                  left: `${(hour / 24) * 100}%`,
                  transform: hour === 0 ? "none" : hour === 24 ? "translateX(-100%)" : "translateX(-50%)",
                }}
              >
                {String(hour).padStart(2, "0")}
              </span>
            ))}
          </div>
          <div className="day-track" style={{ height: trackHeight }}>
            {bands.length === 0 ? <p className="day-empty">这一天都空闲</p> : null}
            {bands.map((band) => {
              const hours = (band.endRatio - band.startRatio) * 24;
              const showName = hours >= 0.95;
              const showDetail = hours >= 2.95;
              return (
                <div
                  key={`${band.userId}-${band.startRatio}-${band.detail}`}
                  className={band.uncertain ? "day-band is-maybe" : "day-band"}
                  style={{
                    left: `${band.startRatio * 100}%`,
                    width: `${(band.endRatio - band.startRatio) * 100}%`,
                    top: band.lane * 28 + 2,
                    backgroundColor: band.color,
                  }}
                  title={`${band.name} · ${band.detail}`}
                >
                  {showName ? <span>{showDetail ? `${band.name} ${band.label}` : band.name}</span> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ul className="space-y-2">
        {members.map((member) => {
          const entries = member.entries.filter((entry) =>
            overlaps(entry.startAt, entry.endAt, bounds.start, bounds.end),
          );
          const summary =
            entries.length === 0
              ? "空闲"
              : entries.map((entry) => describeDayEntry(day, entry, groupId).detail).join("；");
          return (
            <li key={member.userId} className="flex items-baseline gap-2 text-sm">
              <span className="inline-flex shrink-0 items-center gap-1.5 font-medium">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: member.color }}
                  aria-hidden="true"
                />
                {member.name}
              </span>
              <span className="text-muted">{summary}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
