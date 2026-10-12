import { EditOutingForm } from "@/components/edit-outing-form";
import { deleteOuting, setRsvp } from "@/server/outing-actions";
import { formatClock, formatRange, isAllDay, shanghaiYmd } from "@/lib/time";
import type { GroupPageOuting } from "@/server/queries";

const CHOICES = [
  ["going", "参加"],
  ["maybe", "可能"],
  ["no", "不去"],
] as const;

export function OutingList({
  outings,
  members,
  viewerId,
  canModerate,
  month,
  returnTo,
}: {
  outings: GroupPageOuting[];
  members: { userId: string; name: string }[];
  viewerId: string;
  canModerate: boolean;
  month: string;
  returnTo: string;
}) {
  return (
    <>
      {outings.length === 0 ? <p className="px-1 text-[15px] text-muted">还没有行程。</p> : null}
      {outings.length > 0 ? (
        <ul className="inset-group">
          {outings.map((plan) => {
            const mine = plan.responses.find((response) => response.userId === viewerId);
            const responded = new Set(plan.responses.map((response) => response.userId));
            const pending = members.filter((member) => !responded.has(member.userId));
            const canDelete = canModerate || plan.createdBy === viewerId;
            const summary = summaryLine(plan, pending);
            return (
              <li key={plan.id} className="inset-block">
                <h3 className="text-[17px] font-semibold">{plan.title}</h3>
                <p className="mt-0.5 text-[13px] text-muted">
                  {formatRange(plan.startAt, plan.endAt)}
                  {plan.place ? ` · ${plan.place}` : ""}
                </p>
                {summary ? <p className="mt-1 text-[13px] text-ink">{summary}</p> : null}
                <form action={setRsvp} className="mt-3">
                  <input type="hidden" name="outingId" value={plan.id} />
                  <div className="grid grid-cols-3 rounded-[9px] bg-[#e5e5ea] p-0.5">
                    {CHOICES.map(([value, label]) => {
                      const on = mine?.status === value;
                      return (
                        <button
                          key={value}
                          className={`h-8 rounded-[7px] text-[13px] font-medium ${
                            on ? "bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)]" : "text-[#3a3a3c]"
                          }`}
                          name="status"
                          value={value}
                          type="submit"
                          aria-pressed={on}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </form>
                {canDelete ? (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <details className="min-w-0 flex-1">
                      <summary className="cursor-pointer text-[15px] text-accent">修改</summary>
                      <div className="mt-3">
                        <EditOutingForm
                          outingId={plan.id}
                          month={month}
                          returnTo={returnTo}
                          title={plan.title}
                          place={plan.place ?? ""}
                          startDate={shanghaiYmd(plan.startAt)}
                          startTime={formatClock(plan.startAt)}
                          endDate={shanghaiYmd(plan.endAt)}
                          endTime={formatClock(plan.endAt)}
                          allDay={isAllDay(plan.startAt, plan.endAt)}
                        />
                      </div>
                    </details>
                    <form action={deleteOuting}>
                      <input type="hidden" name="outingId" value={plan.id} />
                      <button type="submit" className="text-[15px] text-[#ff3b30]">
                        删除
                      </button>
                    </form>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </>
  );
}

function summaryLine(
  plan: GroupPageOuting,
  pending: { name: string }[],
): string {
  const parts = [
    labeled(plan, "going", "参加"),
    labeled(plan, "maybe", "可能"),
    labeled(plan, "no", "不去"),
  ].filter((part): part is string => Boolean(part));
  if (pending.length > 0) parts.push(`未回 ${pending.map((member) => member.name).join("、")}`);
  return parts.join(" · ");
}

function labeled(plan: GroupPageOuting, status: string, label: string): string | null {
  const matched = plan.responses.filter((response) => response.status === status).map((response) => response.name);
  if (matched.length === 0) return null;
  return `${label} ${matched.join("、")}`;
}
