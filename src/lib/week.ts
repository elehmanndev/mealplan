import {
  addDays,
  format,
  parse,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';

// The app's "week" runs Saturday → Friday (Eric's planning rhythm), not the
// ISO Monday → Sunday week. The week key is the YYYY-MM-DD date of the Saturday
// that opens the week — easy to read in URLs, no W-N collision around year
// boundaries, and `getWeekDates` returns the 7 days in calendar order.

const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;

// 6 = Saturday in date-fns' weekStartsOn convention (Sun=0, Mon=1, ..., Sat=6).
const SATURDAY = 6 as const;

export function formatWeek(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseWeek(week: string): Date {
  if (!WEEK_RE.test(week)) throw new Error(`Invalid week format: ${week}`);
  return parse(week, 'yyyy-MM-dd', new Date());
}

export function getCurrentWeek(now: Date = new Date()): string {
  return formatWeek(startOfWeek(now, { weekStartsOn: SATURDAY }));
}

export function getWeekStart(week: string): Date {
  // The week key already IS the Saturday — but normalize via startOfWeek to be
  // safe against off-by-one timezone slips.
  return startOfWeek(parseWeek(week), { weekStartsOn: SATURDAY });
}

export function getWeekDates(week: string): Date[] {
  const start = getWeekStart(week);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getNextWeek(week: string): string {
  return formatWeek(addDays(getWeekStart(week), 7));
}

export function getPrevWeek(week: string): string {
  return formatWeek(addDays(getWeekStart(week), -7));
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDayLabel(date: Date): string {
  return format(date, "EEEE d MMM", { locale: es }).toUpperCase();
}

export function formatDayInitial(date: Date): string {
  // 0=Sun, 1=Mon, ..., 6=Sat
  const map = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  return map[date.getDay()];
}

export function formatDayName(date: Date): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[date.getDay()];
}

export function formatDayNumber(date: Date): string {
  return format(date, 'd');
}

export function formatWeekLabel(week: string): string {
  // Show "Sem. 2 may" — the Saturday opening the week.
  return `Sem. ${format(getWeekStart(week), "d MMM", { locale: es })}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return formatDate(a) === formatDate(b);
}

export function dateFromString(s: string): Date {
  return parse(s, 'yyyy-MM-dd', new Date());
}
