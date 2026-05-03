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
  it('round trips a YYYY-MM-DD Saturday', () => {
    const d = parseWeek('2026-05-02');
    expect(d.getDay()).toBe(6); // Saturday
    expect(formatWeek(d)).toBe('2026-05-02');
  });

  it('rejects malformed week strings', () => {
    expect(() => parseWeek('2026-W18')).toThrow();
    expect(() => parseWeek('not a week')).toThrow();
  });
});

describe('getWeekStart', () => {
  it('returns the Saturday opening the week', () => {
    expect(formatDate(getWeekStart('2026-05-02'))).toBe('2026-05-02');
  });

  it('snaps a non-Saturday key back to its Saturday (defensive)', () => {
    // 2026-05-05 is a Tuesday; its containing Sat→Fr week opens on 2026-05-02.
    expect(formatDate(getWeekStart('2026-05-05'))).toBe('2026-05-02');
  });
});

describe('getWeekDates', () => {
  it('returns 7 consecutive dates starting on Saturday', () => {
    const dates = getWeekDates('2026-05-02');
    expect(dates).toHaveLength(7);
    expect(dates[0].getDay()).toBe(6); // Sat
    expect(dates[6].getDay()).toBe(5); // Fri
    for (let i = 1; i < 7; i++) {
      const diff = dates[i].getTime() - dates[i - 1].getTime();
      expect(diff).toBe(24 * 3600 * 1000);
    }
    expect(formatDate(dates[0])).toBe('2026-05-02'); // Sat
    expect(formatDate(dates[6])).toBe('2026-05-08'); // Fri
  });
});

describe('getCurrentWeek', () => {
  it('formats as YYYY-MM-DD of the Saturday', () => {
    // 2026-05-04 is a Monday; its Sat→Fr week opens on 2026-05-02.
    expect(getCurrentWeek(new Date(2026, 4, 4, 12))).toBe('2026-05-02');
    // 2026-05-02 is the Saturday itself.
    expect(getCurrentWeek(new Date(2026, 4, 2, 12))).toBe('2026-05-02');
    // 2026-05-08 is the Friday closing the week.
    expect(getCurrentWeek(new Date(2026, 4, 8, 12))).toBe('2026-05-02');
  });
});

describe('next / prev week boundaries', () => {
  it('rolls forward 7 days', () => {
    expect(getNextWeek('2026-05-02')).toBe('2026-05-09');
  });

  it('rolls backward 7 days', () => {
    expect(getPrevWeek('2026-05-02')).toBe('2026-04-25');
  });

  it('crosses month and year boundaries', () => {
    expect(getNextWeek('2026-12-26')).toBe('2027-01-02');
    expect(getPrevWeek('2027-01-02')).toBe('2026-12-26');
  });
});

describe('formatDate', () => {
  it('formats as yyyy-MM-dd', () => {
    expect(formatDate(new Date(2025, 10, 17))).toBe('2025-11-17');
  });
});
