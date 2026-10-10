"use client";

import { useActionState } from "react";

import { buttonClass, inputClass, labelClass } from "@/lib/ui";
import { reviseOutingTime, type ActionState } from "@/server/outing-actions";

const initialState: ActionState = {};

export function ReviseTimeForm({
  outingId,
  startDate,
  startTime,
  endDate,
  endTime,
}: {
  outingId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}) {
  const [state, action, pending] = useActionState(reviseOutingTime, initialState);

  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="outingId" value={outingId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>开始日期</span>
          <input className={inputClass} type="date" name="startDate" required defaultValue={startDate} />
        </label>
        <label className="block">
          <span className={labelClass}>开始时间</span>
          <input className={inputClass} type="time" name="startTime" required defaultValue={startTime} />
        </label>
        <label className="block">
          <span className={labelClass}>结束日期</span>
          <input className={inputClass} type="date" name="endDate" required defaultValue={endDate} />
        </label>
        <label className="block">
          <span className={labelClass}>结束时间</span>
          <input className={inputClass} type="time" name="endTime" required defaultValue={endTime} />
        </label>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      ) : null}
      <button className={buttonClass} type="submit" disabled={pending}>
        {pending ? "保存中…" : "用这个时间，并同意"}
      </button>
    </form>
  );
}
