
-- Change entitlement from integer to numeric to support 0.5 values
ALTER TABLE public.employees ALTER COLUMN entitlement TYPE numeric USING entitlement::numeric;

-- Add half_day boolean to absences (defaults to false for existing records)
ALTER TABLE public.absences ADD COLUMN half_day boolean NOT NULL DEFAULT false;

-- Add half_day boolean to holiday_requests
ALTER TABLE public.holiday_requests ADD COLUMN half_day boolean NOT NULL DEFAULT false;
