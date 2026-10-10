"use client";

const stateLabel = {
  busy: "忙碌",
  maybe: "可能有空",
  free: "空闲",
} as const;

export function ParticipantPicker({
  people,
  selected,
  viewerId,
  onToggle,
}: {
  people: { userId: string; name: string; state?: "free" | "busy" | "maybe" }[];
  selected: readonly string[];
  viewerId: string;
  onToggle: (userId: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-[13px] font-medium text-muted">一起去的人</legend>
      <p className="text-[13px] text-muted">勾上的人会在收件箱里看到邀请。他们同意之后，行程才出现在日历上。</p>
      <ul className="overflow-hidden rounded-2xl bg-card">
        {people.map((person) => {
          const checked = selected.includes(person.userId);
          const name = person.userId === viewerId ? `${person.name}（我）` : person.name;
          return (
            <li key={person.userId} className="border-b border-line last:border-b-0">
              <label className="flex items-center gap-3 px-3 py-2.5 text-[17px]">
                <input
                  type="checkbox"
                  name="participant"
                  value={person.userId}
                  checked={checked}
                  onChange={() => onToggle(person.userId)}
                  className="size-5 accent-[#007aff]"
                />
                <span className="min-w-0 flex-1 truncate">{name}</span>
                {person.state ? (
                  <span className={person.state === "free" ? "text-sm text-muted" : "text-sm font-medium"}>
                    {stateLabel[person.state]}
                  </span>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>
      <p className="text-[13px] text-muted">已选 {selected.length} / {people.length} 人</p>
    </fieldset>
  );
}
