export type AbsenceType = 'H' | 'S' | 'P';

export interface Employee {
  id: string;
  name: string;
  store: string;
}

export interface AbsenceRecord {
  employeeId: string;
  date: string; // YYYY-MM-DD
  type: AbsenceType;
}

export interface AppData {
  employees: Employee[];
  absences: AbsenceRecord[];
  stores: string[];
  year: number;
}

export const ABSENCE_LABELS: Record<AbsenceType, string> = {
  H: 'Holiday',
  S: 'Sick',
  P: 'Personal',
};

export const UK_HOLIDAY_ENTITLEMENT = 28;
