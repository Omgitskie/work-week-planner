import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AppData, Employee, AbsenceRecord, AbsenceType } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';

interface AppContextType {
  data: AppData;
  loading: boolean;
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
  const [data, setData] = useState<AppData>({
    employees: [],
    absences: [],
    stores: [],
    year: 2026,
  });
  const [loading, setLoading] = useState(true);

  // Load all data from Supabase on mount
  useEffect(() => {
    async function fetchAll() {
      const [empRes, absRes, storeRes] = await Promise.all([
        supabase.from('employees').select('*').order('name'),
        supabase.from('absences').select('*'),
        supabase.from('stores').select('*').order('name'),
      ]);

      setData(prev => ({
        ...prev,
        employees: (empRes.data || []).map(e => ({ id: e.id, name: e.name, store: e.store })),
        absences: (absRes.data || []).map(a => ({ employeeId: a.employee_id, date: a.date, type: a.type as AbsenceType })),
        stores: (storeRes.data || []).map(s => s.name),
      }));
      setLoading(false);
    }
    fetchAll();
  }, []);

  const addEmployee = useCallback(async (name: string, store: string) => {
    const { data: inserted, error } = await supabase
      .from('employees')
      .insert({ name, store })
      .select()
      .single();
    if (error || !inserted) return;
    setData(prev => ({
      ...prev,
      employees: [...prev.employees, { id: inserted.id, name: inserted.name, store: inserted.store }],
    }));
  }, []);

  const updateEmployee = useCallback(async (id: string, name: string, store: string) => {
    await supabase.from('employees').update({ name, store }).eq('id', id);
    setData(prev => ({
      ...prev,
      employees: prev.employees.map(e => (e.id === id ? { ...e, name, store } : e)),
    }));
  }, []);

  const removeEmployee = useCallback(async (id: string) => {
    await supabase.from('employees').delete().eq('id', id);
    // absences cascade-deleted in DB
    setData(prev => ({
      ...prev,
      employees: prev.employees.filter(e => e.id !== id),
      absences: prev.absences.filter(a => a.employeeId !== id),
    }));
  }, []);

  const addAbsences = useCallback(async (employeeId: string, type: AbsenceRecord['type'], dates: string[]) => {
    // Upsert absences (unique on employee_id + date)
    const rows = dates.map(d => ({ employee_id: employeeId, date: d, type }));
    await supabase.from('absences').upsert(rows, { onConflict: 'employee_id,date' });

    setData(prev => {
      const existing = new Set(prev.absences.filter(a => a.employeeId === employeeId).map(a => a.date));
      const newAbsences = dates
        .filter(d => !existing.has(d))
        .map(d => ({ employeeId, date: d, type }));
      const updatedAbsences = prev.absences.map(a => {
        if (a.employeeId === employeeId && dates.includes(a.date)) {
          return { ...a, type };
        }
        return a;
      });
      return { ...prev, absences: [...updatedAbsences, ...newAbsences] };
    });
  }, []);

  const removeAbsence = useCallback(async (employeeId: string, date: string) => {
    await supabase.from('absences').delete().eq('employee_id', employeeId).eq('date', date);
    setData(prev => ({
      ...prev,
      absences: prev.absences.filter(a => !(a.employeeId === employeeId && a.date === date)),
    }));
  }, []);

  const addStore = useCallback(async (store: string) => {
    await supabase.from('stores').insert({ name: store });
    setData(prev => ({
      ...prev,
      stores: [...prev.stores, store],
    }));
  }, []);

  const removeStore = useCallback(async (store: string) => {
    await supabase.from('stores').delete().eq('name', store);
    setData(prev => ({
      ...prev,
      stores: prev.stores.filter(s => s !== store),
    }));
  }, []);

  const setYear = useCallback((year: number) => {
    setData(prev => ({ ...prev, year }));
  }, []);

  return (
    <AppContext.Provider value={{ data, loading, addEmployee, updateEmployee, removeEmployee, addAbsences, removeAbsence, addStore, removeStore, setYear }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppData must be inside AppProvider');
  return ctx;
}
