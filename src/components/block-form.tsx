"use client";

import { useActionState, useState } from "react";

import { buttonClass, inputClass, labelClass } from "@/lib/ui";
import { createBlock, type ActionState } from "@/server/block-actions";
import { currentShanghaiYmd } from "@/lib/time";

const initialState: ActionState = {};

export function BlockForm({ returnTo, defaultDate }: { returnTo: string; defaultDate?: string }) {
  const [state, action, pending] = useActionState(createBlock, initialState);
  const day = defaultDate ?? currentShanghaiYmd();
  const [endDate, setEndDate] = useState(day);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      <label className="block">
        <span className={labelClass}>被什么事占用</span>
        <input className={inputClass} name="title" required maxLength={80} placeholder="加班" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>开始日期</span>
          <input
            className={inputClass}
            type="date"
            name="startDate"
            required
            defaultValue={day}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelClass}>开始时间</span>
          <input className={inputClass} type="time" name="startTime" required defaultValue="19:00" />
        </label>
        <label className="block">
          <span className={labelClass}>结束日期</span>
          <input
            className={inputClass}
            type="date"
            name="endDate"
            required
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelClass}>结束时间</span>
          <input className={inputClass} type="time" name="endTime" required defaultValue="22:00" />
        </label>
      </div>
      <label className="flex items-center justify-between rounded-xl bg-[#f2f2f7] px-3 py-3 text-[17px]">
        <span>只显示忙碌</span>
        <input className="size-5 accent-[#34c759]" type="checkbox" name="hideTitle" />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      ) : null}
      <button className={`${buttonClass} w-full`} type="submit" disabled={pending}>
        {pending ? "保存中…" : "添加占用"}
      </button>
    </form>
  );
}
