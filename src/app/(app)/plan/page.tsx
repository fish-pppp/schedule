import Link from "next/link";
import { Suspense } from "react";

import { Chevron } from "@/components/group-rows";
import { Loading } from "@/components/loading";
import { OutingForm } from "@/components/outing-form";
import { cardClass } from "@/lib/ui";
import { currentShanghaiYmd, isYmd } from "@/lib/time";
import { requireGroupMember, requireUser } from "@/server/guard";
import { listGroupMembers, listPlanTargets } from "@/server/queries";

export const metadata = { title: "约一下" };

export default function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; group?: string; with?: string }>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <PlanContent searchParams={searchParams} />
    </Suspense>
  );
}

function hrefFor(date: string, extra?: { group?: string; with?: string }) {
  const params = new URLSearchParams();
  params.set("date", date);
  if (extra?.group) params.set("group", extra.group);
  if (extra?.with) params.set("with", extra.with);
  return `/plan?${params.toString()}`;
}

async function PlanContent({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; group?: string; with?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const date = params.date && isYmd(params.date) ? params.date : currentShanghaiYmd();
  const targets = await listPlanTargets(user.id);
  const friend = params.with ? targets.friends.find((person) => person.userId === params.with) : undefined;

  if (params.with && !friend) {
    return (
      <Missing
        title="找不到这个人"
        body="只能约已经和你在同一个搭子组里的人。"
        date={date}
      />
    );
  }

  if (params.group) {
    const access = await requireGroupMember(params.group, user.id);
    if (!access) {
      return <Missing title="找不到这个搭子组" body="它可能不存在，或者你还不在里面。" date={date} />;
    }
    if (friend && !friend.groupIds.includes(params.group)) {
      return <Missing title="这个人不在这组里" body="换一个你们共同的搭子组。" date={date} />;
    }
    const members = await listGroupMembers(params.group);
    const selected = friend ? [user.id, friend.userId] : [user.id];
    return (
      <main id="main" className="mx-auto max-w-lg space-y-4">
        <Link href={hrefFor(date)} className="text-[15px] text-accent">
          ‹ 约一下
        </Link>
        <h1 className="text-[34px] leading-tight font-semibold tracking-tight">
          {friend ? `约${friend.name}` : access.groupName}
        </h1>
        {friend ? <p className="px-1 text-[15px] text-muted">记在{access.groupName}。别的组只能看到忙碌。</p> : null}
        <div className={cardClass}>
          <OutingForm
            key={`${params.group}-${friend?.userId ?? "group"}-${date}`}
            groupId={params.group}
            defaultDate={date}
            viewerId={user.id}
            members={members}
            initialSelected={selected}
          />
        </div>
      </main>
    );
  }

  if (friend) {
    const shared = targets.groups.filter((group) => friend.groupIds.includes(group.id));
    if (shared.length === 1 && shared[0]) {
      const only = shared[0];
      const members = await listGroupMembers(only.id);
      return (
        <main id="main" className="mx-auto max-w-lg space-y-4">
          <Link href={hrefFor(date)} className="text-[15px] text-accent">
            ‹ 约一下
          </Link>
          <h1 className="text-[34px] leading-tight font-semibold tracking-tight">约{friend.name}</h1>
          <p className="px-1 text-[15px] text-muted">记在{only.name}。别的组只能看到忙碌。</p>
          <div className={cardClass}>
            <OutingForm
              key={`${only.id}-${friend.userId}-${date}`}
              groupId={only.id}
              defaultDate={date}
              viewerId={user.id}
              members={members}
              initialSelected={[user.id, friend.userId]}
            />
          </div>
        </main>
      );
    }
    return (
      <main id="main" className="mx-auto max-w-lg">
        <Link href={hrefFor(date)} className="text-[15px] text-accent">
          ‹ 约一下
        </Link>
        <h1 className="mt-1 text-[34px] leading-tight font-semibold tracking-tight">约{friend.name}</h1>
        <p className="mt-2 px-1 text-[15px] text-muted">记在哪个搭子组。别的组只能看到忙碌。</p>
        {shared.length === 0 ? (
          <p className="mt-6 px-1 text-[15px] text-muted">你们还没有共同的搭子组。</p>
        ) : (
          <ul className="inset-group mt-6">
            {shared.map((group, index) => (
              <li key={group.id}>
                <Link href={hrefFor(date, { group: group.id, with: friend.userId })} className="inset-row">
                  {index > 0 ? <span className="inset-line is-flush" aria-hidden="true" /> : null}
                  <span className="size-2.5 shrink-0 rounded-[4px]" style={{ backgroundColor: group.color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-[17px]">{group.name}</span>
                  <Chevron />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto max-w-lg">
      <Link href="/" className="text-[15px] text-accent">
        ‹ 日程
      </Link>
      <h1 className="mt-1 text-[34px] leading-tight font-semibold tracking-tight">约一下</h1>
      <p className="mt-2 px-1 text-[15px] text-muted">约一整组，或只约一个已经同组的人。时间按北京时间。</p>
      <h2 className="mt-8 mb-2 px-1 text-[13px] text-muted">搭子组</h2>
      {targets.groups.length === 0 ? (
        <p className="px-1 text-[15px] text-muted">
          还没有组。{" "}
          <Link href="/groups/new" className="text-accent">
            新建一个
          </Link>
        </p>
      ) : (
        <ul className="inset-group">
          {targets.groups.map((group, index) => (
            <li key={group.id}>
              <Link href={hrefFor(date, { group: group.id })} className="inset-row">
                {index > 0 ? <span className="inset-line is-flush" aria-hidden="true" /> : null}
                <span className="size-2.5 shrink-0 rounded-[4px]" style={{ backgroundColor: group.color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[17px]">{group.name}</span>
                <Chevron />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <h2 className="mt-8 mb-2 px-1 text-[13px] text-muted">好友</h2>
      {targets.friends.length === 0 ? (
        <p className="px-1 text-[15px] text-muted">同组之后，人会出现在这里。</p>
      ) : (
        <ul className="inset-group">
          {targets.friends.map((person, index) => {
            const names = targets.groups.filter((group) => person.groupIds.includes(group.id)).map((group) => group.name);
            return (
              <li key={person.userId}>
                <Link href={hrefFor(date, { with: person.userId })} className="inset-row">
                  {index > 0 ? <span className="inset-line is-flush" aria-hidden="true" /> : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px]">{person.name}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-muted">{names.join("、")}</span>
                  </span>
                  <Chevron />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function Missing({ title, body, date }: { title: string; body: string; date: string }) {
  return (
    <main id="main" className="mx-auto max-w-lg space-y-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted">{body}</p>
      <Link href={hrefFor(date)} className="text-sm font-medium text-accent">
        返回约一下
      </Link>
    </main>
  );
}
