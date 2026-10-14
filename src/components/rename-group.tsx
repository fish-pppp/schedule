"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { buttonClass, inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";
import { renameGroup } from "@/server/group-actions";

export function RenameGroup({
  groupId,
  name,
  color,
}: {
  groupId: string;
  name: string;
  color: string;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function open() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    setError(null);
    const input = dialog.querySelector("input[name=name]");
    if (input instanceof HTMLInputElement) {
      input.value = name;
    }
    dialog.showModal();
    if (input instanceof HTMLInputElement) {
      input.focus();
      input.select();
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await renameGroup({}, new FormData(event.currentTarget));
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    dialogRef.current?.close();
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="flex min-w-0 items-center gap-2 text-left text-[22px] leading-none font-semibold tracking-tight"
        aria-label={`修改组名，当前是${name}`}
      >
        <span className="inline-block size-2.5 shrink-0 rounded-[4px]" style={{ backgroundColor: color }} aria-hidden="true" />
        <span className="truncate">{name}</span>
        <Pencil />
      </button>
      <dialog
        ref={dialogRef}
        className="slot-dialog rounded-[28px] bg-paper p-5 text-ink"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        onClose={() => setError(null)}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <h2 className="text-[20px] font-semibold tracking-tight">修改组名</h2>
          <label className="block">
            <span className={labelClass}>组名</span>
            <input className={inputClass} name="name" defaultValue={name} required maxLength={40} />
          </label>
          <input type="hidden" name="groupId" value={groupId} />
          {error ? (
            <p role="alert" className="text-sm text-accent">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button type="button" className={secondaryButtonClass} onClick={() => dialogRef.current?.close()}>
              取消
            </button>
            <button className={buttonClass} type="submit" disabled={pending}>
              {pending ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function Pencil() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true" className="shrink-0 text-muted">
      <path
        d="M9.2 2.4 12.6 5.8 5.1 13.3 1.4 13.6 1.7 9.9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M8 3.6 11.4 7" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
