import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CheckCircle, Clock, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { ABSENCE_LABELS, AbsenceType } from '@/lib/types';

interface HolidayRequest {
  id: string;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export default function StaffBooking() {
  const { user, signOut } = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState('');
  const [entitlement, setEntitlement] = useState(28);
  const [usedDays, setUsedDays] = useState(0);
  const [type, setType] = useState<AbsenceType>('H');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [requests, setRequests] = useState<HolidayRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      // Get employee record linked to this user
      const { data: emp } = await supabase
        .from('employees')
        .select('id, name, entitlement')
        .eq('user_id', user.id)
        .single();

      if (emp) {
        setEmployeeId(emp.id);
        setEmployeeName(emp.name);
        setEntitlement(emp.entitlement ?? 28);

        // Load existing requests and absences in parallel
        const [reqsRes, absRes] = await Promise.all([
          supabase
            .from('holiday_requests')
            .select('*')
            .eq('employee_id', emp.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('absences')
            .select('date, type')
            .eq('employee_id', emp.id),
        ]);

        setRequests(reqsRes.data || []);
        // Count used holiday days (type 'H')
        const holidayDays = (absRes.data || []).filter(a => a.type === 'H').length;
        setUsedDays(holidayDays);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !startDate || !endDate) return;

    const { data: inserted, error } = await supabase
      .from('holiday_requests')
      .insert({
        employee_id: employeeId,
        type,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error submitting request', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Request submitted', description: 'Your holiday request has been sent for approval.' });
    if (inserted) setRequests(prev => [inserted, ...prev]);
    setStartDate(undefined);
    setEndDate(undefined);
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading...</div>;

  if (!employeeId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Your account is not linked to an employee record.</p>
          <p className="text-sm text-muted-foreground">Please contact your manager.</p>
          <Button variant="outline" onClick={signOut}>Sign Out</Button>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-personal/20 text-personal-foreground',
    approved: 'bg-holiday/20 text-holiday-foreground',
    rejected: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Holiday Tracker</h1>
          <p className="text-sm text-muted-foreground">Welcome, {employeeName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>
          <LogOut className="w-4 h-4 mr-1.5" /> Sign Out
        </Button>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Leave balance card */}
        <div className="border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-semibold mb-3">Your Holiday Balance</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md bg-secondary p-3">
              <p className="text-2xl font-bold text-foreground">{entitlement}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="rounded-md bg-secondary p-3">
              <p className="text-2xl font-bold text-foreground">{usedDays}</p>
              <p className="text-xs text-muted-foreground">Used</p>
            </div>
            <div className="rounded-md bg-secondary p-3">
              <p className={cn('text-2xl font-bold', entitlement - usedDays <= 3 ? 'text-destructive' : 'text-foreground')}>{entitlement - usedDays}</p>
              <p className="text-xs text-muted-foreground">Remaining</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Request Time Off</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
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
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={!startDate || !endDate}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Submit Request
            </Button>
          </form>
        </div>

        {/* Previous requests */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Your Requests</h3>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <div className="space-y-2">
              {requests.map(r => (
                <div key={r.id} className="border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{ABSENCE_LABELS[r.type as AbsenceType] || r.type}</p>
                    <p className="text-xs text-muted-foreground">{r.start_date} → {r.end_date}</p>
                  </div>
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium capitalize', statusColors[r.status] || '')}>
                    {r.status === 'pending' && <Clock className="w-3 h-3 inline mr-1" />}
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
