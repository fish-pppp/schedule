import { deleteOuting, setRsvp } from "@/server/outing-actions";
import { formatRange } from "@/lib/time";
import { buttonClass, cardClass, secondaryButtonClass } from "@/lib/ui";
import type { GroupPageOuting } from "@/server/queries";

export function OutingList({
  outings,
  members,
  viewerId,
  canModerate,
}: {
  outings: GroupPageOuting[];
  members: { userId: string; name: string }[];
  viewerId: string;
  canModerate: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">接下来的行程</h2>
      {outings.length === 0 ? <p className="text-sm text-muted">还没有要发生的行程。</p> : null}
      <ul className="space-y-3">
        {outings.map((plan) => {
          const mine = plan.responses.find((response) => response.userId === viewerId);
          const responded = new Set(plan.responses.map((response) => response.userId));
          const pending = members.filter((member) => !responded.has(member.userId));
          const canDelete = canModerate || plan.createdBy === viewerId;
          return (
            <li key={plan.id} className={cardClass}>
              <h3 className="text-base font-semibold">{plan.title}</h3>
              <p className="mt-1 text-sm">{formatRange(plan.startAt, plan.endAt)}</p>
              {plan.place ? <p className="text-sm text-muted">{plan.place}</p> : null}
              <dl className="mt-3 space-y-1 text-sm">
                <div>
                  <dt className="inline font-medium">参加：</dt>
                  <dd className="inline">{names(plan.responses, "going")}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">可能：</dt>
                  <dd className="inline">{names(plan.responses, "maybe")}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">不参加：</dt>
                  <dd className="inline">{names(plan.responses, "no")}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">未回复：</dt>
                  <dd className="inline">{pending.map((member) => member.name).join("、") || "没有"}</dd>
                </div>
              </dl>
              <form action={setRsvp} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="outingId" value={plan.id} />
                <button
                  className={mine?.status === "going" ? buttonClass : secondaryButtonClass}
                  name="status"
                  value="going"
                  type="submit"
                  aria-pressed={mine?.status === "going"}
                >
                  参加
                </button>
                <button
                  className={mine?.status === "maybe" ? buttonClass : secondaryButtonClass}
                  name="status"
                  value="maybe"
                  type="submit"
                  aria-pressed={mine?.status === "maybe"}
                >
                  可能
                </button>
                <button
                  className={mine?.status === "no" ? buttonClass : secondaryButtonClass}
                  name="status"
                  value="no"
                  type="submit"
                  aria-pressed={mine?.status === "no"}
                >
                  不参加
                </button>
              </form>
              {canDelete ? (
                <form action={deleteOuting} className="mt-3">
                  <input type="hidden" name="outingId" value={plan.id} />
                  <button type="submit" className="text-sm text-muted underline">
                    删除行程
                  </button>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function names(responses: GroupPageOuting["responses"], status: string): string {
  const matched = responses.filter((response) => response.status === status).map((response) => response.name);
  return matched.join("、") || "没有";
}
