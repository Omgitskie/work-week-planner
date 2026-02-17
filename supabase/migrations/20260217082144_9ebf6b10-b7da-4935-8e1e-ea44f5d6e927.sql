
-- Create stores table
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  store TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create absences table
CREATE TABLE public.absences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('H', 'S', 'P')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Enable RLS on all tables
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;

-- Since this is a single-user/team app without auth, allow all operations publicly
CREATE POLICY "Allow all access to stores" ON public.stores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to absences" ON public.absences FOR ALL USING (true) WITH CHECK (true);

-- Seed default stores
INSERT INTO public.stores (name) VALUES ('London'), ('Manchester'), ('Birmingham'), ('Leeds'), ('Bristol');

-- Seed default employees
INSERT INTO public.employees (name, store) VALUES
  ('Alice Johnson', 'London'),
  ('Bob Smith', 'London'),
  ('Carol Williams', 'Manchester'),
  ('David Brown', 'Manchester'),
  ('Emma Davis', 'Birmingham'),
  ('Frank Wilson', 'Leeds'),
  ('Grace Taylor', 'Bristol'),
  ('Henry Moore', 'London');

-- Create indexes
CREATE INDEX idx_absences_employee_id ON public.absences(employee_id);
CREATE INDEX idx_absences_date ON public.absences(date);
CREATE INDEX idx_employees_store ON public.employees(store);
