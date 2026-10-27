import { holidayCellText, holidayOn, holidayPhrase } from "@/lib/holidays";

export function HolidayLabel({ ymd, inMonth }: { ymd: string; inMonth: boolean }) {
  const text = holidayCellText(ymd);
  const holiday = holidayOn(ymd);
  if (!text || !holiday) return null;
  const color = !inMonth ? "text-[#c7c7cc]" : holiday.off ? "text-[#ff3b30]" : "text-ink";
  return (
    <span className={`block w-full truncate text-center text-[10px] font-medium leading-[12px] ${color}`}>
      {text}
    </span>
  );
}

export function HolidayNote({ ymd, className = "text-[13px]" }: { ymd: string; className?: string }) {
  const text = holidayPhrase(ymd);
  const holiday = holidayOn(ymd);
  if (!text || !holiday) return null;
  return <p className={`${className} ${holiday.off ? "text-[#ff3b30]" : "text-muted"}`}>{text}</p>;
}
