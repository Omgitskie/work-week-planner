import { NavLink, Outlet } from 'react-router-dom';
import { CalendarDays, BarChart3, PlusCircle, Users, Download, Inbox, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { exportToCSV } from '@/lib/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const tabs = [
  { to: '/', label: 'Calendar', icon: CalendarDays },
  { to: '/summary', label: 'Summary', icon: BarChart3 },
  { to: '/book', label: 'Book Time Off', icon: PlusCircle },
  { to: '/employees', label: 'Employees', icon: Users },
  { to: '/requests', label: 'Requests', icon: Inbox },
];

export default function Layout() {
  const { data, setYear } = useAppData();
  const { signOut } = useAuth();

  const handleExport = () => {
    const csv = exportToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `holiday-tracker-${data.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold text-foreground tracking-tight">Holiday Tracker</h1>
          <nav className="flex gap-1">
            {tabs.map(tab => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`
                }
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(data.year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-[100px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-1.5" />
            Sign Out
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
