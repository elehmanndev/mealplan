import {
  addDays,
  addWeeks,
  format,
  getISOWeek,
  getISOWeekYear,
  parseISO,
  setISOWeek,
  setISOWeekYear,
  startOfISOWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';

const WEEK_RE = /^(\d{4})-W(\d{1,2})$/;

export function formatWeek(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function parseWeek(week: string): { year: number; week: number } {
  const m = WEEK_RE.exec(week);
  if (!m) throw new Error(`Invalid week format: ${week}`);
  return { year: Number(m[1]), week: Number(m[2]) };
}

export function getCurrentWeek(now: Date = new Date()): string {
  return formatWeek(getISOWeekYear(now), getISOWeek(now));
}

export function getWeekStart(week: string): Date {
  const { year, week: w } = parseWeek(week);
  // Anchor to Jan 4 (always in W1 per ISO 8601), then set year/week, then start of ISO week.
  const anchor = new Date(Date.UTC(year, 0, 4));
  const withYear = setISOWeekYear(anchor, year);
  const withWeek = setISOWeek(withYear, w);
  return startOfISOWeek(withWeek);
}

export function getWeekDates(week: string): Date[] {
  const start = getWeekStart(week);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getNextWeek(week: string): string {
  const start = getWeekStart(week);
  const next = addWeeks(start, 1);
  return formatWeek(getISOWeekYear(next), getISOWeek(next));
}

export function getPrevWeek(week: string): string {
  const start = getWeekStart(week);
  const prev = addWeeks(start, -1);
  return formatWeek(getISOWeekYear(prev), getISOWeek(prev));
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDayLabel(date: Date): string {
  return format(date, "EEEE d MMM", { locale: es }).toUpperCase();
}

export function formatDayInitial(date: Date): string {
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
  const { week: w } = parseWeek(week);
  return `Sem. ${w}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return formatDate(a) === formatDate(b);
}

export function dateFromString(s: string): Date {
  return parseISO(s);
}
