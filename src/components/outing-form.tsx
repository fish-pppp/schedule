"use client";

import { useActionState, useEffect, useState } from "react";

import { buttonClass, inputClass, labelClass } from "@/lib/ui";
import { checkAvailability, createOuting, type ActionState, type AvailabilityPreview } from "@/server/outing-actions";

const initialState: ActionState = {};

const stateLabel = {
  busy: "忙碌",
  maybe: "可能有空",
  free: "空闲",
} as const;

export function OutingForm({ groupId, defaultDate }: { groupId: string; defaultDate: string }) {
  const [state, action, pending] = useActionState(createOuting, initialState);
  const [startDate, setStartDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("14:00");
  const [endDate, setEndDate] = useState(defaultDate);
  const [endTime, setEndTime] = useState("17:00");
  const [preview, setPreview] = useState<AvailabilityPreview | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const startKey = `${startDate}T${startTime}`;
    const endKey = `${endDate}T${endTime}`;
    if (!startDate || !endDate || !startTime || !endTime || endKey <= startKey) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setChecking(true);
      void checkAvailability(groupId, startDate, startTime, endDate, endTime).then((result) => {
        if (cancelled) return;
        setPreview(result);
        setChecking(false);
      });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [groupId, startDate, startTime, endDate, endTime]);

  const invalid = `${endDate}T${endTime}` <= `${startDate}T${startTime}`;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />
      <label className="block min-w-0">
        <span className={labelClass}>行程</span>
        <input className={inputClass} name="title" required maxLength={80} placeholder="周六打球" />
      </label>
      <label className="block min-w-0">
        <span className={labelClass}>地点</span>
        <input className={inputClass} name="place" maxLength={120} placeholder="可选" />
      </label>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className={labelClass}>开始日期</span>
          <input
            className={inputClass}
            type="date"
            name="startDate"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label className="block min-w-0">
          <span className={labelClass}>开始时间</span>
          <input
            className={inputClass}
            type="time"
            name="startTime"
            required
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
        </label>
        <label className="block min-w-0">
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
        <label className="block min-w-0">
          <span className={labelClass}>结束时间</span>
          <input
            className={inputClass}
            type="time"
            name="endTime"
            required
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
          />
        </label>
      </div>
      <p className="text-sm text-muted">
        本组能看到标题和地点。你默认参加；改成不参加后，这段时间就不会占用你。其他搭子组只能看到忙碌或可能忙。时间按北京时间。
      </p>
      <AvailabilityList checking={checking} invalid={invalid} preview={preview} />
      {state.error ? (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      ) : null}
      <button className={buttonClass} type="submit" disabled={pending || invalid}>
        {pending ? "创建中…" : "约这个行程"}
      </button>
    </form>
  );
}

function AvailabilityList({
  checking,
  invalid,
  preview,
}: {
  checking: boolean;
  invalid: boolean;
  preview: AvailabilityPreview | null;
}) {
  if (invalid) return <p className="text-sm text-muted">结束时间要晚于开始时间。</p>;
  if (checking && !preview) return <p className="text-sm text-muted">正在看大家的空闲…</p>;
  if (!preview) return <p className="text-sm text-muted">选择时间后，这里会列出谁有空。</p>;
  if ("error" in preview) return <p className="text-sm text-accent">{preview.error}</p>;
  if (preview.people.length === 0) return null;

  return (
    <div className="rounded-2xl border border-line bg-paper p-3">
      <p className="text-sm font-medium">这个时段</p>
      <ul className="mt-2 space-y-1 text-sm">
        {preview.people.map((person) => (
          <li key={person.userId} className="flex items-center justify-between gap-3">
            <span>{person.name}</span>
            <span className={person.state === "free" ? "text-muted" : "font-medium"}>{stateLabel[person.state]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
