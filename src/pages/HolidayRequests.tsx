import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppData } from '@/context/AppContext';
import { formatDate } from '@/lib/store';
import { ABSENCE_LABELS, AbsenceType } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Check, X, AlertTriangle, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PendingRequest {
  id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export default function HolidayRequests() {
  const { data, addAbsences } = useAppData();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: reqs } = await supabase
        .from('holiday_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      setRequests(reqs || []);
      setLoading(false);
    }
    load();
  }, []);

  // Detect clashes: same store, overlapping dates
  const clashes = useMemo(() => {
    const clashMap = new Map<string, string[]>(); // request id -> clashing employee names

    requests.forEach(req => {
      const emp = data.employees.find(e => e.id === req.employee_id);
      if (!emp) return;

      const clashNames: string[] = [];

      // Check against existing absences in the same store
      const storeEmployees = data.employees.filter(e => e.store === emp.store && e.id !== emp.id);
      const reqStart = new Date(req.start_date);
      const reqEnd = new Date(req.end_date);

      storeEmployees.forEach(other => {
        const otherAbsences = data.absences.filter(a => a.employeeId === other.id);
        const hasOverlap = otherAbsences.some(a => {
          const d = new Date(a.date);
          return d >= reqStart && d <= reqEnd;
        });
        if (hasOverlap) clashNames.push(other.name);
      });

      // Check against other pending requests in the same store
      requests.forEach(otherReq => {
        if (otherReq.id === req.id) return;
        const otherEmp = data.employees.find(e => e.id === otherReq.employee_id);
        if (!otherEmp || otherEmp.store !== emp.store) return;

        const otherStart = new Date(otherReq.start_date);
        const otherEnd = new Date(otherReq.end_date);
        if (reqStart <= otherEnd && reqEnd >= otherStart) {
          clashNames.push(otherEmp.name);
        }
      });

      if (clashNames.length > 0) {
        clashMap.set(req.id, [...new Set(clashNames)]);
      }
    });

    return clashMap;
  }, [requests, data.employees, data.absences]);

  const handleAccept = async (req: PendingRequest) => {
    // Generate weekday dates between start and end
    const dates: string[] = [];
    const d = new Date(req.start_date);
    const end = new Date(req.end_date);
    while (d <= end) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) {
        dates.push(formatDate(d));
      }
      d.setDate(d.getDate() + 1);
    }

    if (dates.length === 0) {
      toast({ title: 'No weekdays in range', variant: 'destructive' });
      return;
    }

    // Add to absences
    addAbsences(req.employee_id, req.type as AbsenceType, dates);

    // Update request status
    await supabase
      .from('holiday_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', req.id);

    setRequests(prev => prev.filter(r => r.id !== req.id));
    const emp = data.employees.find(e => e.id === req.employee_id);
    toast({ title: 'Request approved', description: `${dates.length} day(s) added for ${emp?.name}` });
  };

  const handleReject = async (req: PendingRequest) => {
    await supabase
      .from('holiday_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', req.id);

    setRequests(prev => prev.filter(r => r.id !== req.id));
    toast({ title: 'Request rejected' });
  };

  if (loading) return <div className="p-4 text-muted-foreground">Loading requests...</div>;

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">
        Holiday Requests
        {requests.length > 0 && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({requests.length} pending)
          </span>
        )}
      </h2>

      {requests.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No pending requests</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-grid-header">
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="font-semibold">Store</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Dates</TableHead>
                <TableHead className="font-semibold">Clashes</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(req => {
                const emp = data.employees.find(e => e.id === req.employee_id);
                const reqClashes = clashes.get(req.id);
                return (
                  <TableRow key={req.id} className={reqClashes ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-medium">{emp?.name || 'Unknown'}</TableCell>
                    <TableCell className="text-muted-foreground">{emp?.store || '—'}</TableCell>
                    <TableCell>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded font-medium',
                        req.type === 'H' ? 'absence-holiday' : req.type === 'S' ? 'absence-sick' : 'absence-personal'
                      )}>
                        {ABSENCE_LABELS[req.type as AbsenceType] || req.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {req.start_date} → {req.end_date}
                    </TableCell>
                    <TableCell>
                      {reqClashes ? (
                        <div className="flex items-center gap-1 text-destructive text-xs">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Clashes with: {reqClashes.join(', ')}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAccept(req)}>
                          <Check className="w-3.5 h-3.5 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs hover:text-destructive" onClick={() => handleReject(req)}>
                          <X className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
