import { ReviseTimeForm } from "@/components/revise-time-form";
import { acceptInvite, declineInvite, deleteOuting } from "@/server/outing-actions";
import { formatClock, formatRange, shanghaiYmd } from "@/lib/time";
import { buttonClass, secondaryButtonClass } from "@/lib/ui";
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
  const sections = [
    { key: "received", title: "别人约我", items: received, answer: true, sent: false },
    { key: "waiting", title: "等别人同意", items: waiting, answer: false, sent: false },
    { key: "sent", title: "我发出的", items: sent, answer: false, sent: true },
  ].filter((section) => section.items.length > 0);

  if (sections.length === 0) {
    return <p className="px-1 text-[15px] text-muted">没有待处理的行程。</p>;
  }

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.key}>
          <h2 className="mb-2 px-4 text-[13px] text-muted">{section.title}</h2>
          <ul className="inset-group">
            {section.items.map((plan) => (
              <li key={plan.id} className="inset-block">
                <p className="text-[13px] text-muted">
                  {plan.createdBy === viewerId ? "我发起" : `${plan.creatorName} 约你`} · {plan.groupName}
                </p>
                <h3 className="mt-0.5 text-[17px] font-semibold">{plan.title}</h3>
                <p className="mt-0.5 text-[13px] text-muted">
                  {formatRange(plan.startAt, plan.endAt)}
                  {plan.place ? ` · ${plan.place}` : ""}
                </p>
                {section.answer || (section.sent && plan.myStatus === "invited") ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <form action={acceptInvite}>
                      <input type="hidden" name="outingId" value={plan.id} />
                      <button className={`${buttonClass} w-full`} type="submit">
                        同意
                      </button>
                    </form>
                    <form action={declineInvite}>
                      <input type="hidden" name="outingId" value={plan.id} />
                      <button className={`${secondaryButtonClass} w-full`} type="submit">
                        不去
                      </button>
                    </form>
                  </div>
                ) : null}
                <details className="mt-3">
                  <summary className="cursor-pointer text-[15px] text-accent">更多</summary>
                  <p className="mt-3 text-[13px] text-muted">{statusLine(plan.people)}</p>
                  <div className="mt-3">
                    <ReviseTimeForm outingId={plan.id} {...timeFields(plan)} />
                  </div>
                  {section.sent ? (
                    <form action={deleteOuting} className="mt-3">
                      <input type="hidden" name="outingId" value={plan.id} />
                      <button type="submit" className="text-[15px] text-[#ff3b30]">
                        撤回
                      </button>
                    </form>
                  ) : null}
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
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
