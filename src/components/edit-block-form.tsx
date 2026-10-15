"use client";

import { useActionState, useState } from "react";

import { buttonClass, inputClass, labelClass } from "@/lib/ui";
import { addDays } from "@/lib/time";
import { updateBlock, type ActionState } from "@/server/block-actions";

const initialState: ActionState = {};

export function EditBlockForm({
  id,
  title,
  startDate,
  startTime,
  endDate,
  endTime,
  wholeDays,
  hideTitle,
  returnTo,
}: {
  id: string;
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  wholeDays: boolean;
  hideTitle: boolean;
  returnTo: string;
}) {
  const [state, action, pending] = useActionState(updateBlock, initialState);
  const [whole, setWhole] = useState(wholeDays);
  const [startDay, setStartDay] = useState(startDate);
  const [endDay, setEndDay] = useState(endDate);
  const [startClock, setStartClock] = useState(wholeDays ? "19:00" : startTime);
  const [endClock, setEndClock] = useState(wholeDays ? "22:00" : endTime);

  const submittedStart = whole ? "00:00" : startClock;
  const submittedEnd = whole ? "00:00" : endClock;
  const submittedEndDay = whole ? addDays(endDay, 1) : endDay;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="startDate" value={startDay} />
      <input type="hidden" name="endDate" value={submittedEndDay} />
      <input type="hidden" name="startTime" value={submittedStart} />
      <input type="hidden" name="endTime" value={submittedEnd} />
      <label className="block">
        <span className={labelClass}>被什么事占用</span>
        <input className={inputClass} name="title" required maxLength={80} defaultValue={title} />
      </label>
      <label className="flex items-center justify-between rounded-xl bg-[#f2f2f7] px-3 py-3 text-[17px]">
        <span>全天</span>
        <input
          className="size-5 accent-[#34c759]"
          type="checkbox"
          checked={whole}
          onChange={(event) => setWhole(event.target.checked)}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>开始日期</span>
          <input
            className={inputClass}
            type="date"
            required
            value={startDay}
            onChange={(event) => {
              const next = event.target.value;
              setStartDay(next);
              setEndDay((current) => (current < next ? next : current));
            }}
          />
        </label>
        {whole ? null : (
          <label className="block">
            <span className={labelClass}>开始时间</span>
            <input
              className={inputClass}
              type="time"
              required
              value={startClock}
              onChange={(event) => setStartClock(event.target.value)}
            />
          </label>
        )}
        <label className="block">
          <span className={labelClass}>结束日期</span>
          <input
            className={inputClass}
            type="date"
            required
            min={startDay}
            value={endDay}
            onChange={(event) => setEndDay(event.target.value)}
          />
        </label>
        {whole ? null : (
          <label className="block">
            <span className={labelClass}>结束时间</span>
            <input
              className={inputClass}
              type="time"
              required
              value={endClock}
              onChange={(event) => setEndClock(event.target.value)}
            />
          </label>
        )}
      </div>
      <p className="text-sm text-muted">结束可以是之后的某一天。勾选全天就是这几天从早到晚都占用。</p>
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
