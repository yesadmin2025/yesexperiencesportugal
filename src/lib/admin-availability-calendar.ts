export interface CalendarCell {
  readonly iso: string;
  readonly day: number;
  readonly inMonth: boolean;
  readonly weekday: number; // JS: Sunday=0 ... Saturday=6
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function toIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

/**
 * Six-week Monday-first month grid. Dates are generated with UTC calendar
 * arithmetic so admin rendering is independent from the browser timezone.
 */
export function buildMonthGrid(year: number, monthIndex: number): CalendarCell[] {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const firstWeekdayMondayFirst = (first.getUTCDay() + 6) % 7;
  const gridStart = new Date(Date.UTC(year, monthIndex, 1 - firstWeekdayMondayFirst));
  const cells: CalendarCell[] = [];

  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart.getTime() + i * 86_400_000);
    const cellYear = d.getUTCFullYear();
    const cellMonth = d.getUTCMonth();
    const cellDay = d.getUTCDate();
    cells.push({
      iso: toIsoDate(cellYear, cellMonth, cellDay),
      day: cellDay,
      inMonth: cellYear === year && cellMonth === monthIndex,
      weekday: d.getUTCDay(),
    });
  }
  return cells;
}

export function normaliseBlackoutDates(dates: readonly string[] | null | undefined): string[] {
  return [...new Set((dates ?? []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
}

export function toggleBlackoutDate(
  dates: readonly string[] | null | undefined,
  iso: string,
): string[] {
  const current = new Set(normaliseBlackoutDates(dates));
  if (current.has(iso)) current.delete(iso);
  else current.add(iso);
  return [...current].sort();
}

export function normaliseWeekdays(days: readonly number[] | null | undefined): number[] {
  const valid = new Set((days ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6));
  return [...valid].sort((a, b) => a - b);
}

export function toggleOperatingWeekday(
  days: readonly number[] | null | undefined,
  weekday: number,
): number[] {
  const current = new Set(normaliseWeekdays(days));
  if (current.has(weekday)) current.delete(weekday);
  else current.add(weekday);
  return [...current].sort((a, b) => a - b);
}
