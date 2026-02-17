import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const SESSION_KEY = 'ht-authenticated';

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored === 'true') setAuthenticated(true);
    setChecking(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-password', {
        body: { password: password.trim() },
      });

      if (error) throw error;

      if (data?.valid) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        setAuthenticated(true);
      } else {
        toast({ title: 'Incorrect password', variant: 'destructive' });
        setPassword('');
      }
    } catch {
      toast({ title: 'Error verifying password', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;
  if (authenticated) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Holiday Tracker</h1>
          <p className="text-sm text-muted-foreground">Enter password to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            className="text-center"
          />
          <Button type="submit" className="w-full" disabled={loading || !password.trim()}>
            {loading ? 'Verifying...' : 'Enter'}
          </Button>
        </form>
      </div>
    </div>
  );
}
