import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [adminExists, setAdminExists] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const { error } = await supabase.functions.invoke('setup-admin', {
          body: { email: '', password: '' },
        });
        if (error) {
          // For non-2xx responses, try to read the response body from the context
          let msg = '';
          try {
            const ctx = (error as any)?.context;
            if (ctx && typeof ctx.json === 'function') {
              const body = await ctx.json();
              msg = body?.error || '';
            }
          } catch {
            msg = error.message || '';
          }
          if (msg.includes('already exists')) {
            setAdminExists(true);
            setSetupMode(false);
          }
        }
      } catch {
        setAdminExists(true);
      }
      setCheckingSetup(false);
    }
    check();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);

    if (setupMode) {
      // Create admin account
      const { data: result, error } = await supabase.functions.invoke('setup-admin', {
        body: { email: email.trim(), password },
      });
      if (error || result?.error) {
        toast({ title: 'Setup failed', description: result?.error || error?.message, variant: 'destructive' });
        setLoading(false);
        return;
      }
      toast({ title: 'Admin account created', description: 'Signing you in...' });
      // Now sign in
      const { error: signInError } = await signIn(email.trim(), password);
      if (signInError) {
        toast({ title: 'Sign in failed', description: signInError, variant: 'destructive' });
      }
    } else {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        toast({ title: 'Login failed', description: error, variant: 'destructive' });
      }
    }
    setLoading(false);
  };

  if (checkingSetup) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            {setupMode ? <ShieldCheck className="w-7 h-7 text-primary" /> : <Lock className="w-7 h-7 text-primary" />}
          </div>
          <h1 className="text-xl font-bold tracking-tight">Holiday Tracker</h1>
          <p className="text-sm text-muted-foreground">
            {setupMode ? 'Create your admin account' : 'Sign in with your email and password'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <Button type="submit" className="w-full" disabled={loading || !email.trim() || !password}>
            {loading ? (setupMode ? 'Creating...' : 'Signing in...') : (setupMode ? 'Create Admin Account' : 'Sign In')}
          </Button>
        </form>
        {!adminExists && (
          <button
            onClick={() => setSetupMode(!setupMode)}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            {setupMode ? 'Already have an account? Sign in' : 'First time? Set up admin account'}
          </button>
        )}
      </div>
    </div>
  );
}
