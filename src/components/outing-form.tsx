"use client";

import { useActionState, useEffect, useState } from "react";

import { ParticipantPicker } from "@/components/participant-picker";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";
import { checkAvailability, createOuting, type ActionState, type AvailabilityPreview } from "@/server/outing-actions";

const initialState: ActionState = {};

export function OutingForm({
  groupId,
  defaultDate,
  viewerId,
  members,
  initialSelected,
}: {
  groupId: string;
  defaultDate: string;
  viewerId: string;
  members: { userId: string; name: string }[];
  initialSelected?: string[];
}) {
  const [state, action, pending] = useActionState(createOuting, initialState);
  const [startDate, setStartDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("14:00");
  const [endDate, setEndDate] = useState(defaultDate);
  const [endTime, setEndTime] = useState("17:00");
  const [selected, setSelected] = useState<string[]>(
    initialSelected && initialSelected.length > 0 ? [...new Set(initialSelected)] : [viewerId],
  );
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
      <label className="block">
        <span className={labelClass}>行程</span>
        <input className={inputClass} name="title" required maxLength={80} placeholder="周六打球" />
      </label>
      <label className="block">
        <span className={labelClass}>地点</span>
        <input className={inputClass} name="place" maxLength={120} placeholder="可选" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
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
        <label className="block">
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
        只约自己会直接出现在日历上。约了别人，要等他们在收件箱里同意；同意前都可以改时间。时间按北京时间。
      </p>
      <ParticipantPicker
        people={members.map((member) => ({
          ...member,
          state:
            preview && !("error" in preview)
              ? preview.people.find((person) => person.userId === member.userId)?.state
              : undefined,
        }))}
        selected={selected}
        viewerId={viewerId}
        onToggle={(userId) =>
          setSelected((current) =>
            current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
          )
        }
      />
      {selected.length === 0 ? <p className="text-sm text-muted">先勾选一起去的人。</p> : null}
      {invalid ? <p className="text-sm text-muted">结束时间要晚于开始时间。</p> : null}
      {checking && !preview ? <p className="text-sm text-muted">正在看大家的空闲…</p> : null}
      {preview && "error" in preview ? <p className="text-sm text-accent">{preview.error}</p> : null}
      {state.error ? (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      ) : null}
      <button className={buttonClass} type="submit" disabled={pending || invalid || selected.length === 0}>
        {pending ? "发送中…" : "发出邀请"}
      </button>
    </form>
  );
}
