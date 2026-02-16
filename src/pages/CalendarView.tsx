import { useMemo, useRef, useState } from 'react';
import { useAppData } from '@/context/AppContext';
import { getDaysInYear } from '@/lib/store';
import { AbsenceType } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CELL_W = 28;
const STICKY_W = 220; // name + store columns total

export default function CalendarView() {
  const { data, addAbsences, removeAbsence } = useAppData();
  const [filterName, setFilterName] = useState('');
  const [filterStores, setFilterStores] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => getDaysInYear(data.year), [data.year]);
  const monthGroups = useMemo(() => {
    const groups: { month: number; startIdx: number; count: number }[] = [];
    let currentMonth = -1;
    days.forEach((d, i) => {
      if (d.month !== currentMonth) {
        groups.push({ month: d.month, startIdx: i, count: 0 });
        currentMonth = d.month;
      }
      groups[groups.length - 1].count++;
    });
    return groups;
  }, [days]);

  const absMap = useMemo(() => {
    const m = new Map<string, AbsenceType>();
    data.absences.forEach(a => m.set(`${a.employeeId}_${a.date}`, a.type));
    return m;
  }, [data.absences]);

  const employees = useMemo(() => {
    return data.employees
      .filter(e => {
        const nameMatch = e.name.toLowerCase().includes(filterName.toLowerCase());
        const storeMatch = filterStores.length === 0 || filterStores.includes(e.store);
        return nameMatch && storeMatch;
      })
      .sort((a, b) => a.store.localeCompare(b.store) || a.name.localeCompare(b.name));
  }, [data.employees, filterName, filterStores]);

  const scrollToMonth = (monthIdx: number) => {
    const group = monthGroups.find(g => g.month === monthIdx);
    if (group && scrollRef.current) {
      const offset = group.startIdx * CELL_W;
      scrollRef.current.scrollLeft = offset;
    }
  };

  const handleCellClick = (employeeId: string, dateStr: string) => {
    const key = `${employeeId}_${dateStr}`;
    if (absMap.has(key)) {
      removeAbsence(employeeId, dateStr);
    } else {
      addAbsences(employeeId, 'H', [dateStr]);
    }
  };

  const totalWidth = days.length * CELL_W;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-card shrink-0 flex-wrap">
        <Input
          placeholder="Filter by name..."
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
          className="w-48 h-8 text-sm"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-48 h-8 text-sm justify-between">
              {filterStores.length === 0 ? 'All Stores' : `${filterStores.length} store${filterStores.length > 1 ? 's' : ''}`}
              <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            {data.stores.map(s => (
              <label key={s} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded">
                <Checkbox
                  checked={filterStores.includes(s)}
                  onCheckedChange={(checked) => {
                    setFilterStores(prev =>
                      checked ? [...prev, s] : prev.filter(x => x !== s)
                    );
                  }}
                />
                {s}
              </label>
            ))}
            {filterStores.length > 0 && (
              <Button variant="ghost" size="sm" className="w-full mt-1 h-7 text-xs" onClick={() => setFilterStores([])}>
                Clear all
              </Button>
            )}
          </PopoverContent>
        </Popover>
        <div className="flex gap-1 ml-auto flex-wrap">
          {MONTHS.map((m, i) => (
            <Button
              key={i}
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => scrollToMonth(i)}
            >
              {m}
            </Button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-1.5 border-b bg-card text-xs shrink-0">
        <span className="text-muted-foreground">Click cell to toggle Holiday. Use Book Time Off for other types.</span>
        <div className="flex gap-3 ml-auto">
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded absence-holiday inline-flex items-center justify-center text-[10px] font-bold">H</span> Holiday</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded absence-sick inline-flex items-center justify-center text-[10px] font-bold">S</span> Sick</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded absence-personal inline-flex items-center justify-center text-[10px] font-bold">P</span> Personal</span>
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 overflow-hidden relative">
        <div ref={scrollRef} className="overflow-auto h-full">
          <div style={{ minWidth: STICKY_W + totalWidth }}>
            {/* Header row - months */}
            <div className="flex sticky top-0 z-30 bg-grid-header border-b">
              <div className="sticky left-0 z-40 bg-grid-header flex shrink-0" style={{ width: STICKY_W }}>
                <div className="w-[140px] px-2 py-1 text-xs font-semibold text-muted-foreground border-r">Name</div>
                <div className="w-[80px] px-2 py-1 text-xs font-semibold text-muted-foreground border-r">Store</div>
              </div>
              {monthGroups.map(g => (
                <div
                  key={g.month}
                  className="text-xs font-semibold text-center py-1 border-r text-muted-foreground"
                  style={{ width: g.count * CELL_W }}
                >
                  {MONTHS[g.month]} {data.year}
                </div>
              ))}
            </div>

            {/* Header row - day numbers */}
            <div className="flex sticky top-[28px] z-30 bg-grid-header border-b">
              <div className="sticky left-0 z-40 bg-grid-header flex shrink-0" style={{ width: STICKY_W }}>
                <div className="w-[140px] border-r" />
                <div className="w-[80px] border-r" />
              </div>
              {days.map((d, i) => (
                <div
                  key={i}
                  className={`text-[10px] text-center py-0.5 border-r shrink-0 ${
                    d.dayOfWeek === 0 || d.dayOfWeek === 6 ? 'grid-weekend font-medium' : 'text-muted-foreground'
                  }`}
                  style={{ width: CELL_W }}
                >
                  {d.date.getDate()}
                </div>
              ))}
            </div>

            {/* Day-of-week row */}
            <div className="flex sticky top-[52px] z-30 bg-grid-header border-b">
              <div className="sticky left-0 z-40 bg-grid-header flex shrink-0" style={{ width: STICKY_W }}>
                <div className="w-[140px] border-r" />
                <div className="w-[80px] border-r" />
              </div>
              {days.map((d, i) => {
                const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                return (
                  <div
                    key={i}
                    className={`text-[9px] text-center py-0.5 border-r shrink-0 ${
                      d.dayOfWeek === 0 || d.dayOfWeek === 6 ? 'grid-weekend font-medium' : 'text-muted-foreground'
                    }`}
                    style={{ width: CELL_W }}
                  >
                    {dayLetters[d.dayOfWeek]}
                  </div>
                );
              })}
            </div>

            {/* Employee rows */}
            {employees.map(emp => (
              <div key={emp.id} className="flex border-b hover:bg-accent/30">
                <div className="sticky left-0 z-20 bg-grid-sticky flex shrink-0 border-r" style={{ width: STICKY_W }}>
                  <div className="w-[140px] px-2 py-1 text-xs truncate border-r font-medium">{emp.name}</div>
                  <div className="w-[80px] px-2 py-1 text-[11px] truncate text-muted-foreground">{emp.store}</div>
                </div>
                {days.map((d, i) => {
                  const key = `${emp.id}_${d.dateStr}`;
                  const val = absMap.get(key);
                  const isWeekend = d.dayOfWeek === 0 || d.dayOfWeek === 6;
                  return (
                    <div
                      key={i}
                      className={`border-r shrink-0 flex items-center justify-center cursor-pointer transition-colors ${
                        isWeekend ? 'grid-weekend' : ''
                      } ${
                        val === 'H' ? 'absence-holiday' : val === 'S' ? 'absence-sick' : val === 'P' ? 'absence-personal' : 'hover:bg-accent'
                      }`}
                      style={{ width: CELL_W, height: 26 }}
                      onClick={() => handleCellClick(emp.id, d.dateStr)}
                      title={`${emp.name} - ${d.dateStr}`}
                    >
                      {val && <span className="text-[10px] font-bold">{val}</span>}
                    </div>
                  );
                })}
              </div>
            ))}

            {employees.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No employees found. Adjust filters or add employees.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
