"use client";

import { useActionState } from "react";

import { buttonClass } from "@/lib/ui";
import { joinGroup, type ActionState } from "@/server/group-actions";

const initialState: ActionState = {};

export function JoinForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(joinGroup, initialState);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="code" value={code} />
      {state.error ? (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      ) : null}
      <button className={buttonClass} type="submit" disabled={pending}>
        {pending ? "加入中…" : "加入这个组"}
      </button>
    </form>
  );
}
