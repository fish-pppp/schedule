"use client";

import { useActionState } from "react";

import { buttonClass, inputClass, labelClass } from "@/lib/ui";
import { createGroup, type ActionState } from "@/server/group-actions";

const initialState: ActionState = {};

export function GroupForm() {
  const [state, action, pending] = useActionState(createGroup, initialState);

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className={labelClass}>组名</span>
        <input className={inputClass} name="name" required maxLength={40} placeholder="周五羽毛球" />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      ) : null}
      <button className={buttonClass} type="submit" disabled={pending}>
        {pending ? "创建中…" : "创建搭子组"}
      </button>
    </form>
  );
}
