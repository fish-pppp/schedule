"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

export function DisplayNameForm({ name }: { name: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!nextName) {
      setError("显示名不能为空");
      setSaved(false);
      return;
    }
    if (nextName.length > 40) {
      setError("显示名最多 40 个字");
      setSaved(false);
      return;
    }
    setPending(true);
    setError(null);
    const result = await authClient.updateUser({ name: nextName });
    setPending(false);
    if (result.error) {
      setSaved(false);
      setError("没有保存，请再试一次");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className={labelClass}>显示名</span>
        <input className={inputClass} name="name" defaultValue={name} required maxLength={40} autoComplete="nickname" />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      ) : null}
      {saved ? <p className="text-sm text-muted">已保存</p> : null}
      <button className={buttonClass} type="submit" disabled={pending}>
        {pending ? "保存中…" : "保存"}
      </button>
    </form>
  );
}
