import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CheckCircle, Clock, LogOut, Pencil, X, Ban } from 'lucide-react';
import { format, addWeeks, isAfter, parseISO } from 'date-fns';
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

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState<AbsenceType>('H');
  const [editStart, setEditStart] = useState<Date>();
  const [editEnd, setEditEnd] = useState<Date>();

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data: emp } = await supabase
        .from('employees')
        .select('id, name, entitlement')
        .eq('user_id', user.id)
        .single();

      if (emp) {
        setEmployeeId(emp.id);
        setEmployeeName(emp.name);
        setEntitlement(emp.entitlement ?? 28);

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

  const startEditing = (req: HolidayRequest) => {
    setEditingId(req.id);
    setEditType(req.type as AbsenceType);
    setEditStart(parseISO(req.start_date));
    setEditEnd(parseISO(req.end_date));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditStart(undefined);
    setEditEnd(undefined);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editStart || !editEnd) return;

    const { error } = await supabase
      .from('holiday_requests')
      .update({
        type: editType,
        start_date: format(editStart, 'yyyy-MM-dd'),
        end_date: format(editEnd, 'yyyy-MM-dd'),
      })
      .eq('id', editingId);

    if (error) {
      toast({ title: 'Error updating request', description: error.message, variant: 'destructive' });
      return;
    }

    setRequests(prev =>
      prev.map(r =>
        r.id === editingId
          ? { ...r, type: editType, start_date: format(editStart, 'yyyy-MM-dd'), end_date: format(editEnd, 'yyyy-MM-dd') }
          : r
      )
    );
    toast({ title: 'Request updated' });
    cancelEditing();
  };

  const canRequestCancellation = (req: HolidayRequest): { allowed: boolean; reason?: string } => {
    const today = new Date();
    const startDt = parseISO(req.start_date);
    const endDt = parseISO(req.end_date);

    // If end date already passed, can't cancel
    if (!isAfter(endDt, today)) {
      return { allowed: false, reason: 'Dates have already passed' };
    }

    // If start date is within 4 weeks, can't cancel
    const fourWeeksFromNow = addWeeks(today, 4);
    if (!isAfter(startDt, fourWeeksFromNow)) {
      return { allowed: false, reason: 'Cannot cancel within 4 weeks of start date' };
    }

    return { allowed: true };
  };

  const handleRequestCancellation = async (req: HolidayRequest) => {
    const check = canRequestCancellation(req);
    if (!check.allowed) {
      toast({ title: 'Cannot cancel', description: check.reason, variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('holiday_requests')
      .update({ status: 'cancel_pending' })
      .eq('id', req.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    setRequests(prev => prev.map(r => (r.id === req.id ? { ...r, status: 'cancel_pending' } : r)));
    toast({ title: 'Cancellation requested', description: 'Your manager will review this.' });
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
    cancel_pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    cancelled: 'bg-muted text-muted-foreground',
  };

  const statusLabels: Record<string, string> = {
    pending: 'pending',
    approved: 'approved',
    rejected: 'rejected',
    cancel_pending: 'cancellation pending',
    cancelled: 'cancelled',
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
              {requests.map(r => {
                const isEditing = editingId === r.id;

                if (isEditing) {
                  return (
                    <div key={r.id} className="border rounded-lg p-3 space-y-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Edit Request</p>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEditing}>
                          <X className="w-3.5 h-3.5 mr-1" /> Cancel
                        </Button>
                      </div>
                      <Select value={editType} onValueChange={v => setEditType(v as AbsenceType)}>
                        <SelectTrigger className="w-full h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="H">Holiday</SelectItem>
                          <SelectItem value="S">Sick</SelectItem>
                          <SelectItem value="P">Personal</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="grid grid-cols-2 gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn('w-full justify-start text-left text-xs h-8', !editStart && 'text-muted-foreground')}>
                              <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                              {editStart ? format(editStart, 'dd/MM/yy') : 'Start'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={editStart} onSelect={setEditStart} initialFocus className="p-3 pointer-events-auto" />
                          </PopoverContent>
                        </Popover>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn('w-full justify-start text-left text-xs h-8', !editEnd && 'text-muted-foreground')}>
                              <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                              {editEnd ? format(editEnd, 'dd/MM/yy') : 'End'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={editEnd} onSelect={setEditEnd} initialFocus className="p-3 pointer-events-auto" />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Button size="sm" className="w-full h-8 text-xs" onClick={handleSaveEdit} disabled={!editStart || !editEnd}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Save Changes
                      </Button>
                    </div>
                  );
                }

                const cancelCheck = r.status === 'approved' ? canRequestCancellation(r) : null;

                return (
                  <div key={r.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{ABSENCE_LABELS[r.type as AbsenceType] || r.type}</p>
                      <p className="text-xs text-muted-foreground">{r.start_date} → {r.end_date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === 'pending' && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEditing(r)} title="Edit request">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {r.status === 'approved' && cancelCheck?.allowed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs hover:text-destructive"
                          onClick={() => handleRequestCancellation(r)}
                          title="Request cancellation"
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" /> Cancel
                        </Button>
                      )}
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium capitalize', statusColors[r.status] || '')}>
                        {r.status === 'pending' && <Clock className="w-3 h-3 inline mr-1" />}
                        {statusLabels[r.status] || r.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
