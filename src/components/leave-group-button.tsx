"use client";

import { useState } from "react";

import { leaveGroup } from "@/server/group-actions";

export function LeaveGroupButton({
  groupId,
  name,
  sole,
}: {
  groupId: string;
  name: string;
  sole: boolean;
}) {
  const [pending, setPending] = useState(false);
  const message = sole
    ? `退出后「${name}」会被解散，组里的行程也会一起删掉。`
    : `退出「${name}」后，你不再看到这个组，你在组里的参加状态也会取消。`;

  return (
    <form
      action={leaveGroup}
      onSubmit={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
          return;
        }
        setPending(true);
      }}
    >
      <input type="hidden" name="groupId" value={groupId} />
      <button
        type="submit"
        className="shrink-0 px-2 py-1.5 text-[15px] font-medium text-[#ff3b30] disabled:opacity-40"
        disabled={pending}
      >
        {pending ? "退出中…" : "退出"}
      </button>
    </form>
  );
}
