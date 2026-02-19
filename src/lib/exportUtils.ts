import { AppData } from './types';
import { getDaysInYear, getUKBankHolidays } from './store';

export function exportCalendarCSV(data: AppData): string {
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

export function exportSummaryCSV(data: AppData): string {
  const header = ['Name', 'Store', 'Entitlement', 'Holiday', 'Sick', 'Personal', 'Remaining'].join(',');
  const rows = data.employees.map(emp => {
    const empAbs = data.absences.filter(a => a.employeeId === emp.id);
    const holidays = empAbs.filter(a => a.type === 'H').length;
    const sick = empAbs.filter(a => a.type === 'S').length;
    const personal = empAbs.filter(a => a.type === 'P').length;
    const remaining = emp.entitlement - holidays;
    return [
      `"${emp.name}"`,
      `"${emp.store}"`,
      emp.entitlement,
      holidays,
      sick,
      personal,
      remaining,
    ].join(',');
  });

  return [header, ...rows].join('\n');
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
