import Link from "next/link";

import type { AgendaDay } from "@/lib/agenda";
import { Chevron } from "@/components/group-rows";

export function AgendaList({ days }: { days: AgendaDay[] }) {
  return (
    <div className="space-y-8">
      {days.map((day) => (
        <section key={day.ymd} aria-labelledby={`day-${day.ymd}`}>
          <div className="mb-2 flex items-end justify-between gap-3 px-1">
            <div className="min-w-0">
              <h2 id={`day-${day.ymd}`} className="text-[22px] font-semibold tracking-tight">
                {day.title}
              </h2>
              {day.subtitle ? <p className="text-[13px] text-muted">{day.subtitle}</p> : null}
            </div>
            <Link href={`/plan?date=${day.ymd}`} className="mb-0.5 shrink-0 text-[17px] text-accent">
              约
            </Link>
          </div>
          {day.mine.length > 0 ? (
            <ul className="inset-group">
              {day.mine.map((item, index) => (
                <li key={item.key}>
                  <Link href={item.href} className="inset-row">
                    {index > 0 ? <span className="inset-line is-flush" aria-hidden="true" /> : null}
                    <span
                      className="size-2.5 shrink-0 rounded-[4px]"
                      style={{ backgroundColor: item.color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[17px]">{item.title}</span>
                      <span className="mt-0.5 block truncate text-[13px] text-muted">
                        {line(item.when, item.meta, item.place)}
                      </span>
                    </span>
                    <Chevron />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {day.others.length > 0 ? (
            <div className={day.mine.length > 0 ? "mt-3" : undefined}>
              <p className="mb-2 px-1 text-[13px] text-muted">别人</p>
              <ul className="inset-group">
                {day.others.map((item, index) => (
                  <li key={item.key}>
                    {item.href ? (
                      <Link href={item.href} className="inset-row">
                        <OtherRow item={item} index={index} />
                      </Link>
                    ) : (
                      <div className="inset-row">
                        <OtherRow item={item} index={index} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}

function OtherRow({
  item,
  index,
}: {
  item: AgendaDay["others"][number];
  index: number;
}) {
  return (
    <>
      {index > 0 ? <span className="inset-line is-flush" aria-hidden="true" /> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px]">{item.name}</span>
        <span className="mt-0.5 block truncate text-[13px] text-muted">{line(item.when, item.label, item.place)}</span>
      </span>
      {item.href ? <Chevron /> : null}
    </>
  );
}

function line(when: string, label: string, place: string | null) {
  return [when, label, place].filter(Boolean).join(" · ");
}
