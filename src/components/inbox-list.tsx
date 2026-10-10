import { ReviseTimeForm } from "@/components/revise-time-form";
import { acceptInvite, declineInvite, deleteOuting } from "@/server/outing-actions";
import { formatClock, formatRange, shanghaiYmd } from "@/lib/time";
import { buttonClass, cardClass, secondaryButtonClass } from "@/lib/ui";
import type { InboxPlan } from "@/server/queries";

export function InboxList({
  received,
  sent,
  waiting,
  viewerId,
}: {
  received: InboxPlan[];
  sent: InboxPlan[];
  waiting: InboxPlan[];
  viewerId: string;
}) {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">别人约我</h2>
        {received.length === 0 ? <p className="text-sm text-muted">还没有人约你。</p> : null}
        <ul className="space-y-3">
          {received.map((plan) => (
            <li key={plan.id} className={cardClass}>
              <PlanBody plan={plan} viewerId={viewerId} />
              <div className="mt-4 flex flex-wrap gap-2">
                <form action={acceptInvite}>
                  <input type="hidden" name="outingId" value={plan.id} />
                  <button className={buttonClass} type="submit">
                    同意
                  </button>
                </form>
                <form action={declineInvite}>
                  <input type="hidden" name="outingId" value={plan.id} />
                  <button className={secondaryButtonClass} type="submit">
                    不参加
                  </button>
                </form>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-accent">修改时间</summary>
                <ReviseTimeForm outingId={plan.id} {...timeFields(plan)} />
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">等别人同意</h2>
        {waiting.length === 0 ? <p className="text-sm text-muted">没有还在等别人的行程。</p> : null}
        <ul className="space-y-3">
          {waiting.map((plan) => (
            <li key={plan.id} className={cardClass}>
              <PlanBody plan={plan} viewerId={viewerId} />
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-accent">修改时间</summary>
                <ReviseTimeForm outingId={plan.id} {...timeFields(plan)} />
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">我发出的</h2>
        {sent.length === 0 ? <p className="text-sm text-muted">没有还在等同意的行程。</p> : null}
        <ul className="space-y-3">
          {sent.map((plan) => (
            <li key={plan.id} className={cardClass}>
              <PlanBody plan={plan} viewerId={viewerId} />
              {plan.myStatus === "invited" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={acceptInvite}>
                    <input type="hidden" name="outingId" value={plan.id} />
                    <button className={buttonClass} type="submit">
                      同意这个时间
                    </button>
                  </form>
                  <form action={declineInvite}>
                    <input type="hidden" name="outingId" value={plan.id} />
                    <button className={secondaryButtonClass} type="submit">
                      不参加
                    </button>
                  </form>
                </div>
              ) : null}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-accent">修改时间</summary>
                <ReviseTimeForm outingId={plan.id} {...timeFields(plan)} />
              </details>
              <form action={deleteOuting} className="mt-3">
                <input type="hidden" name="outingId" value={plan.id} />
                <button type="submit" className="text-sm text-muted underline">
                  撤回邀请
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function PlanBody({ plan, viewerId }: { plan: InboxPlan; viewerId: string }) {
  return (
    <>
      <p className="text-[13px] text-muted">
        {plan.groupName}
        {plan.createdBy === viewerId ? " · 我发起的" : ` · ${plan.creatorName} 发起`}
      </p>
      <h3 className="mt-1 text-base font-semibold">{plan.title}</h3>
      <p className="mt-1 text-sm">{formatRange(plan.startAt, plan.endAt)}</p>
      {plan.place ? <p className="text-sm text-muted">{plan.place}</p> : null}
      <p className="mt-2 text-sm text-muted">{statusLine(plan.people)}</p>
    </>
  );
}

function timeFields(plan: InboxPlan) {
  return {
    startDate: shanghaiYmd(plan.startAt),
    startTime: formatClock(plan.startAt),
    endDate: shanghaiYmd(plan.endAt),
    endTime: formatClock(plan.endAt),
  };
}

function statusLine(people: InboxPlan["people"]): string {
  const label = (status: string) => {
    if (status === "invited") return "待同意";
    if (status === "going") return "已同意";
    if (status === "maybe") return "可能";
    if (status === "no") return "不参加";
    return status;
  };
  if (people.length === 0) return "还没有参与的人";
  return people.map((person) => `${person.name} ${label(person.status)}`).join("、");
}
