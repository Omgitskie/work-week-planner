import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AppData, Employee, AbsenceRecord } from '@/lib/types';
import { loadData, saveData, generateId } from '@/lib/store';

interface AppContextType {
  data: AppData;
  addEmployee: (name: string, store: string) => void;
  updateEmployee: (id: string, name: string, store: string) => void;
  removeEmployee: (id: string) => void;
  addAbsences: (employeeId: string, type: AbsenceRecord['type'], dates: string[]) => void;
  removeAbsence: (employeeId: string, date: string) => void;
  addStore: (store: string) => void;
  removeStore: (store: string) => void;
  setYear: (year: number) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(loadData);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const addEmployee = useCallback((name: string, store: string) => {
    setData(prev => ({
      ...prev,
      employees: [...prev.employees, { id: generateId(), name, store }],
    }));
  }, []);

  const updateEmployee = useCallback((id: string, name: string, store: string) => {
    setData(prev => ({
      ...prev,
      employees: prev.employees.map(e => (e.id === id ? { ...e, name, store } : e)),
    }));
  }, []);

  const removeEmployee = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      employees: prev.employees.filter(e => e.id !== id),
      absences: prev.absences.filter(a => a.employeeId !== id),
    }));
  }, []);

  const addAbsences = useCallback((employeeId: string, type: AbsenceRecord['type'], dates: string[]) => {
    setData(prev => {
      const existing = new Set(prev.absences.filter(a => a.employeeId === employeeId).map(a => a.date));
      const newAbsences = dates
        .filter(d => !existing.has(d))
        .map(d => ({ employeeId, date: d, type }));
      // Also update any existing absences for these dates
      const updatedAbsences = prev.absences.map(a => {
        if (a.employeeId === employeeId && dates.includes(a.date)) {
          return { ...a, type };
        }
        return a;
      });
      return { ...prev, absences: [...updatedAbsences, ...newAbsences] };
    });
  }, []);

  const removeAbsence = useCallback((employeeId: string, date: string) => {
    setData(prev => ({
      ...prev,
      absences: prev.absences.filter(a => !(a.employeeId === employeeId && a.date === date)),
    }));
  }, []);

  const addStore = useCallback((store: string) => {
    setData(prev => ({
      ...prev,
      stores: [...prev.stores, store],
    }));
  }, []);

  const removeStore = useCallback((store: string) => {
    setData(prev => ({
      ...prev,
      stores: prev.stores.filter(s => s !== store),
    }));
  }, []);

  const setYear = useCallback((year: number) => {
    setData(prev => ({ ...prev, year }));
  }, []);

  return (
    <AppContext.Provider value={{ data, addEmployee, updateEmployee, removeEmployee, addAbsences, removeAbsence, addStore, removeStore, setYear }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppData must be inside AppProvider');
  return ctx;
}
