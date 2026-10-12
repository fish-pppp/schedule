import Link from "next/link";

export function GroupRows({
  groups,
}: {
  groups: { id: string; name: string; color: string; count: number }[];
}) {
  return (
    <ul className="inset-group">
      {groups.map((group, index) => (
        <li key={group.id}>
          <Link href={`/groups/${group.id}`} className="inset-row">
            {index > 0 ? <span className="inset-line" aria-hidden="true" /> : null}
            <span
              className="grid size-8 shrink-0 place-items-center rounded-[9px] text-[15px] font-semibold text-white"
              style={{ backgroundColor: group.color }}
              aria-hidden="true"
            >
              {group.name.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1 truncate text-[17px]">{group.name}</span>
            <span className="text-[15px] text-muted tabular-nums">{group.count}</span>
            <Chevron />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Chevron() {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" aria-hidden="true" className="shrink-0 text-[#c7c7cc]">
      <path
        d="M1 1.2 5.8 6 1 10.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
