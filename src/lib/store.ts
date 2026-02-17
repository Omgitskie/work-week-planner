import { AppData } from './types';

// UK Bank Holidays - returns dates for a given year
export function getUKBankHolidays(year: number): string[] {
  const holidays: string[] = [];

  // New Year's Day (or substitute)
  let nyd = new Date(year, 0, 1);
  if (nyd.getDay() === 0) nyd = new Date(year, 0, 2);
  if (nyd.getDay() === 6) nyd = new Date(year, 0, 3);
  holidays.push(formatDate(nyd));

  // Good Friday & Easter Monday (algorithm)
  const easter = computeEaster(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  holidays.push(formatDate(goodFriday));
  holidays.push(formatDate(easterMonday));

  // Early May Bank Holiday (first Monday in May)
  holidays.push(formatDate(getFirstMonday(year, 4)));

  // Spring Bank Holiday (last Monday in May)
  holidays.push(formatDate(getLastMonday(year, 4)));

  // Summer Bank Holiday (last Monday in August)
  holidays.push(formatDate(getLastMonday(year, 7)));

  // Christmas Day (or substitute)
  let xmas = new Date(year, 11, 25);
  if (xmas.getDay() === 0) xmas = new Date(year, 11, 27);
  if (xmas.getDay() === 6) xmas = new Date(year, 11, 27);
  holidays.push(formatDate(xmas));

  // Boxing Day (or substitute)
  let boxing = new Date(year, 11, 26);
  if (boxing.getDay() === 0) boxing = new Date(year, 11, 28);
  if (boxing.getDay() === 6) boxing = new Date(year, 11, 28);
  holidays.push(formatDate(boxing));

  return holidays;
}

function computeEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getFirstMonday(year: number, month: number): Date {
  const d = new Date(year, month, 1);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return d;
}

function getLastMonday(year: number, month: number): Date {
  const d = new Date(year, month + 1, 0);
  while (d.getDay() !== 1) d.setDate(d.getDate() - 1);
  return d;
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDaysInYear(year: number): { date: Date; dateStr: string; month: number; dayOfWeek: number }[] {
  const days: { date: Date; dateStr: string; month: number; dayOfWeek: number }[] = [];
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const d = new Date(start);
  while (d <= end) {
    days.push({
      date: new Date(d),
      dateStr: formatDate(d),
      month: d.getMonth(),
      dayOfWeek: d.getDay(),
    });
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function exportToCSV(data: AppData): string {
  const days = getDaysInYear(data.year);
  const absMap = new Map<string, string>();
  data.absences.forEach(a => absMap.set(`${a.employeeId}_${a.date}`, a.type));

  const header = ['Name', 'Store', ...days.map(d => d.dateStr)].join(',');
  const rows = data.employees.map(emp => {
    const cells = [
      `"${emp.name}"`,
      `"${emp.store}"`,
      ...days.map(d => absMap.get(`${emp.id}_${d.dateStr}`) || ''),
    ];
    return cells.join(',');
  });

  return [header, ...rows].join('\n');
}
