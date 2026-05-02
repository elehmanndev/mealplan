import { describe, it, expect } from 'vitest';
import {
  formatWeek,
  getCurrentWeek,
  getNextWeek,
  getPrevWeek,
  getWeekDates,
  getWeekStart,
  parseWeek,
  formatDate,
} from '../week';

describe('parseWeek / formatWeek', () => {
  it('round trips', () => {
    const { year, week } = parseWeek('2025-W47');
    expect(year).toBe(2025);
    expect(week).toBe(47);
    expect(formatWeek(year, week)).toBe('2025-W47');
  });

  it('pads single-digit weeks', () => {
    expect(formatWeek(2025, 3)).toBe('2025-W03');
  });
});

describe('getWeekStart', () => {
  it('returns Monday for a given ISO week', () => {
    const start = getWeekStart('2025-W47');
    expect(start.getUTCDay() === 1 || start.getDay() === 1).toBe(true);
  });
});

describe('getWeekDates', () => {
  it('returns 7 consecutive dates', () => {
    const dates = getWeekDates('2025-W47');
    expect(dates).toHaveLength(7);
    for (let i = 1; i < 7; i++) {
      const diff = dates[i].getTime() - dates[i - 1].getTime();
      expect(diff).toBe(24 * 3600 * 1000);
    }
  });
});

describe('getCurrentWeek', () => {
  it('formats with year-Wnn', () => {
    expect(getCurrentWeek(new Date('2025-11-19T12:00:00Z'))).toMatch(/^\d{4}-W\d{2}$/);
  });
});

describe('next / prev week boundaries', () => {
  it('rolls into next year past W52', () => {
    expect(getNextWeek('2024-W52')).toBe('2025-W01');
  });

  it('handles 2026 W53 (long year)', () => {
    expect(getNextWeek('2026-W52')).toBe('2026-W53');
    expect(getNextWeek('2026-W53')).toBe('2027-W01');
  });

  it('rolls back into previous year', () => {
    expect(getPrevWeek('2025-W01')).toBe('2024-W52');
    expect(getPrevWeek('2027-W01')).toBe('2026-W53');
  });
});

describe('formatDate', () => {
  it('formats as yyyy-MM-dd', () => {
    expect(formatDate(new Date(2025, 10, 17))).toBe('2025-11-17');
  });
});
