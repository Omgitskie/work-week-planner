import { useMemo, useState } from 'react';
import { useAppData } from '@/context/AppContext';
import { getUKBankHolidays } from '@/lib/store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function SummaryView() {
  const { data } = useAppData();
  const [search, setSearch] = useState('');

  const bankHolidays = useMemo(() => getUKBankHolidays(data.year), [data.year]);

  const summaries = useMemo(() => {
    return data.employees.map(emp => {
      const empAbsences = data.absences.filter(a => a.employeeId === emp.id);
      const holidays = empAbsences.filter(a => a.type === 'H').reduce((sum, a) => sum + (a.halfDay ? 0.5 : 1), 0);
      const sick = empAbsences.filter(a => a.type === 'S').reduce((sum, a) => sum + (a.halfDay ? 0.5 : 1), 0);
      const personal = empAbsences.filter(a => a.type === 'P').reduce((sum, a) => sum + (a.halfDay ? 0.5 : 1), 0);
      const entitlement = emp.entitlement;
      const remaining = entitlement - holidays;

      return { emp, holidays, sick, personal, entitlement, remaining };
    });
  }, [data.employees, data.absences, data.year]);

  const filtered = useMemo(() => {
    if (!search.trim()) return summaries;
    const q = search.toLowerCase();
    return summaries.filter(s => s.emp.name.toLowerCase().includes(q));
  }, [summaries, search]);

  return (
    <div className="p-4 overflow-auto h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Summary & Balances — {data.year}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Entitlement is set per employee (default 28 days). 
            {bankHolidays.length} bank holidays in {data.year}.
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-grid-header">
              <TableHead className="font-semibold">Employee</TableHead>
              <TableHead className="font-semibold">Store</TableHead>
              <TableHead className="text-center font-semibold">
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded absence-holiday" /> Holiday
                </span>
              </TableHead>
              <TableHead className="text-center font-semibold">
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded absence-sick" /> Sick
                </span>
              </TableHead>
              <TableHead className="text-center font-semibold">
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded absence-personal" /> Personal
                </span>
              </TableHead>
              <TableHead className="text-center font-semibold">Entitlement</TableHead>
              <TableHead className="text-center font-semibold">Remaining</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(({ emp, holidays, sick, personal, entitlement, remaining }) => (
              <TableRow key={emp.id}>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell className="text-muted-foreground">{emp.store}</TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold absence-holiday">{holidays}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold absence-sick">{sick}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold absence-personal">{personal}</span>
                </TableCell>
                <TableCell className="text-center font-medium">{entitlement}</TableCell>
                <TableCell className="text-center">
                  <span className={`font-bold ${remaining < 0 ? 'text-destructive' : remaining <= 5 ? 'text-personal' : 'text-holiday'}`}>
                    {remaining}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
