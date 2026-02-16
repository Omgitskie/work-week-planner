import { useState } from 'react';
import { useAppData } from '@/context/AppContext';
import { AbsenceType, ABSENCE_LABELS } from '@/lib/types';
import { formatDate } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function BookTimeOff() {
  const { data, addAbsences } = useAppData();
  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState<AbsenceType>('H');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !startDate || !endDate) return;

    const dates: string[] = [];
    const d = new Date(startDate);
    while (d <= endDate) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) {
        dates.push(formatDate(d));
      }
      d.setDate(d.getDate() + 1);
    }

    if (dates.length === 0) {
      toast({ title: 'No weekdays in selected range', variant: 'destructive' });
      return;
    }

    addAbsences(employeeId, type, dates);
    const emp = data.employees.find(e => e.id === employeeId);
    toast({
      title: 'Time off booked',
      description: `${dates.length} day(s) of ${ABSENCE_LABELS[type]} for ${emp?.name}`,
    });
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-lg font-semibold mb-4">Book Time Off</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Employee</label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select employee..." />
            </SelectTrigger>
            <SelectContent>
              {data.employees.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name} ({e.store})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Type</label>
          <Select value={type} onValueChange={v => setType(v as AbsenceType)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="H">Holiday</SelectItem>
              <SelectItem value="S">Sick</SelectItem>
              <SelectItem value="P">Personal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Start Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : 'Pick date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">End Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !endDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP') : 'Pick date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={!employeeId || !startDate || !endDate}>
          <CheckCircle className="w-4 h-4 mr-2" />
          Book Time Off
        </Button>
      </form>
    </div>
  );
}
