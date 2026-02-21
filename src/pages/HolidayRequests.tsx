import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppData } from '@/context/AppContext';
import { formatDate } from '@/lib/store';
import { ABSENCE_LABELS, AbsenceType } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Check, X, AlertTriangle, Clock, Ban } from 'lucide-react';
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
  const { data, addAbsences, removeAbsence } = useAppData();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: reqs } = await supabase
        .from('holiday_requests')
        .select('*')
        .in('status', ['pending', 'cancel_pending'])
        .order('created_at', { ascending: true });
      setRequests(reqs || []);
      setLoading(false);
    }
    load();
  }, []);

  // Detect clashes: same store, overlapping dates (only for new requests, not cancellations)
  const clashes = useMemo(() => {
    const clashMap = new Map<string, string[]>();
    const newRequests = requests.filter(r => r.status === 'pending');

    newRequests.forEach(req => {
      const emp = data.employees.find(e => e.id === req.employee_id);
      if (!emp) return;

      const clashNames: string[] = [];
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

      newRequests.forEach(otherReq => {
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

    addAbsences(req.employee_id, req.type as AbsenceType, dates);

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

  const handleApproveCancellation = async (req: PendingRequest) => {
    // Remove absence records for this date range
    const d = new Date(req.start_date);
    const end = new Date(req.end_date);
    while (d <= end) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) {
        removeAbsence(req.employee_id, formatDate(d));
      }
      d.setDate(d.getDate() + 1);
    }

    await supabase
      .from('holiday_requests')
      .update({ status: 'cancelled', reviewed_at: new Date().toISOString() })
      .eq('id', req.id);

    setRequests(prev => prev.filter(r => r.id !== req.id));
    const emp = data.employees.find(e => e.id === req.employee_id);
    toast({ title: 'Cancellation approved', description: `Days restored for ${emp?.name}` });
  };

  const handleRejectCancellation = async (req: PendingRequest) => {
    // Revert back to approved
    await supabase
      .from('holiday_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', req.id);

    setRequests(prev => prev.filter(r => r.id !== req.id));
    toast({ title: 'Cancellation declined', description: 'Holiday remains on the calendar.' });
  };

  if (loading) return <div className="p-4 text-muted-foreground">Loading requests...</div>;

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const cancelRequests = requests.filter(r => r.status === 'cancel_pending');

  return (
    <div className="p-4 space-y-6">
      {/* New / Pending requests */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          Holiday Requests
          {pendingRequests.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({pendingRequests.length} pending)
            </span>
          )}
        </h2>

        {pendingRequests.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No pending requests</p>
          </div>
        ) : (
          <RequestTable
            requests={pendingRequests}
            employees={data.employees}
            clashes={clashes}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        )}
      </section>

      {/* Cancellation requests */}
      {cancelRequests.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">
            <Ban className="w-4 h-4 inline mr-2 text-amber-600" />
            Cancellation Requests
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({cancelRequests.length} pending)
            </span>
          </h2>
          <RequestTable
            requests={cancelRequests}
            employees={data.employees}
            clashes={new Map()}
            onAccept={handleApproveCancellation}
            onReject={handleRejectCancellation}
            isCancellation
          />
        </section>
      )}
    </div>
  );
}

interface RequestTableProps {
  requests: PendingRequest[];
  employees: { id: string; name: string; store: string }[];
  clashes: Map<string, string[]>;
  onAccept: (req: PendingRequest) => void;
  onReject: (req: PendingRequest) => void;
  isCancellation?: boolean;
}

function RequestTable({ requests, employees, clashes, onAccept, onReject, isCancellation }: RequestTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-grid-header">
            <TableHead className="font-semibold">Employee</TableHead>
            <TableHead className="font-semibold">Store</TableHead>
            <TableHead className="font-semibold">Type</TableHead>
            <TableHead className="font-semibold">Dates</TableHead>
            {!isCancellation && <TableHead className="font-semibold">Clashes</TableHead>}
            <TableHead className="text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map(req => {
            const emp = employees.find(e => e.id === req.employee_id);
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
                {!isCancellation && (
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
                )}
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAccept(req)}>
                      <Check className="w-3.5 h-3.5 mr-1" /> {isCancellation ? 'Approve' : 'Accept'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs hover:text-destructive" onClick={() => onReject(req)}>
                      <X className="w-3.5 h-3.5 mr-1" /> {isCancellation ? 'Decline' : 'Reject'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
