"use client";

import { useActionState, useState } from "react";

import { buttonClass, inputClass, labelClass } from "@/lib/ui";
import { addDays } from "@/lib/time";
import { updateOuting, type ActionState } from "@/server/outing-actions";

const initialState: ActionState = {};

export function EditOutingForm({
  outingId,
  month,
  returnTo,
  title,
  place,
  startDate,
  startTime,
  endDate,
  endTime,
  allDay,
}: {
  outingId: string;
  month: string;
  returnTo?: string;
  title: string;
  place: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
}) {
  const [state, action, pending] = useActionState(updateOuting, initialState);
  const [wholeDay, setWholeDay] = useState(allDay);
  const [startDay, setStartDay] = useState(startDate);
  const [endDay, setEndDay] = useState(allDay ? startDate : endDate);
  const [startClock, setStartClock] = useState(allDay ? "14:00" : startTime);
  const [endClock, setEndClock] = useState(allDay ? "16:00" : endTime);
  const submittedStart = wholeDay ? "00:00" : startClock;
  const submittedEnd = wholeDay ? "00:00" : endClock;
  const submittedEndDay = wholeDay ? addDays(startDay, 1) : endDay;
  const invalid =
    !wholeDay && (submittedEndDay < startDay || (submittedEndDay === startDay && endClock <= startClock));

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="outingId" value={outingId} />
      <input type="hidden" name="month" value={month} />
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <input type="hidden" name="startDate" value={startDay} />
      <input type="hidden" name="endDate" value={submittedEndDay} />
      <input type="hidden" name="startTime" value={submittedStart} />
      <input type="hidden" name="endTime" value={submittedEnd} />
      <label className="block">
        <span className={labelClass}>行程</span>
        <input className={inputClass} name="title" required maxLength={80} defaultValue={title} />
      </label>
      <label className="block">
        <span className={labelClass}>地点</span>
        <input className={inputClass} name="place" maxLength={120} defaultValue={place} placeholder="可选" />
      </label>
      <label className="flex items-center justify-between rounded-2xl bg-paper px-3 py-3 text-[15px]">
        <span>全天</span>
        <input
          type="checkbox"
          className="size-5 accent-[#34c759]"
          checked={wholeDay}
          onChange={(event) => setWholeDay(event.target.checked)}
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
              if (!wholeDay && endDay < next) setEndDay(next);
            }}
          />
        </label>
        {wholeDay ? null : (
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
        {wholeDay ? null : (
          <>
            <label className="block">
              <span className={labelClass}>结束日期</span>
              <input
                className={inputClass}
                type="date"
                required
                value={endDay}
                onChange={(event) => setEndDay(event.target.value)}
              />
            </label>
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
          </>
        )}
      </div>
      {invalid ? <p className="text-sm text-muted">结束时间要晚于开始时间。</p> : null}
      {state.error ? (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      ) : null}
      <button className={buttonClass} type="submit" disabled={pending || invalid}>
        {pending ? "保存中…" : "保存修改"}
      </button>
    </form>
  );
}
