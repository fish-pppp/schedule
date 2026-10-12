"use client";

import { useActionState, useState } from "react";

import { buttonClass, inputClass, labelClass } from "@/lib/ui";
import { updateBlock, type ActionState } from "@/server/block-actions";

const initialState: ActionState = {};

export function EditBlockForm({
  id,
  title,
  startDate,
  startTime,
  endDate,
  endTime,
  hideTitle,
  returnTo,
}: {
  id: string;
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  hideTitle: boolean;
  returnTo: string;
}) {
  const [state, action, pending] = useActionState(updateBlock, initialState);
  const [endDay, setEndDay] = useState(endDate);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <label className="block">
        <span className={labelClass}>被什么事占用</span>
        <input className={inputClass} name="title" required maxLength={80} defaultValue={title} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>开始日期</span>
          <input
            className={inputClass}
            type="date"
            name="startDate"
            required
            defaultValue={startDate}
            onChange={(event) => {
              const next = event.target.value;
              setEndDay((current) => (current < next ? next : current));
            }}
          />
        </label>
        <label className="block">
          <span className={labelClass}>开始时间</span>
          <input className={inputClass} type="time" name="startTime" required defaultValue={startTime} />
        </label>
        <label className="block">
          <span className={labelClass}>结束日期</span>
          <input
            className={inputClass}
            type="date"
            name="endDate"
            required
            value={endDay}
            onChange={(event) => setEndDay(event.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelClass}>结束时间</span>
          <input className={inputClass} type="time" name="endTime" required defaultValue={endTime} />
        </label>
      </div>
      <label className="flex items-center justify-between rounded-xl bg-[#f2f2f7] px-3 py-3 text-[17px]">
        <span>只显示忙碌</span>
        <input className="size-5 accent-[#34c759]" type="checkbox" name="hideTitle" defaultChecked={hideTitle} />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      ) : null}
      <button className={`${buttonClass} w-full`} type="submit" disabled={pending}>
        {pending ? "保存中…" : "保存修改"}
      </button>
    </form>
  );
}
