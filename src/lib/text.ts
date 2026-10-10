export function requiredText(
  value: FormDataEntryValue | null,
  emptyMessage: string,
  max: number,
  longMessage: string,
): string | { error: string } {
  const text = String(value ?? "").trim();
  if (!text) return { error: emptyMessage };
  if (text.length > max) return { error: longMessage };
  return text;
}

export function isTextError(value: string | { error: string }): value is { error: string } {
  return typeof value !== "string";
}

export function optionalText(
  value: FormDataEntryValue | null,
  max: number,
  longMessage: string,
): string | null | { error: string } {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (text.length > max) return { error: longMessage };
  return text;
}
