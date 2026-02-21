
-- Allow staff to update their own requests (for editing pending and requesting cancellation)
CREATE POLICY "Staff can update own requests"
ON public.holiday_requests
FOR UPDATE
USING (employee_id IN (
  SELECT id FROM employees WHERE user_id = auth.uid()
))
WITH CHECK (employee_id IN (
  SELECT id FROM employees WHERE user_id = auth.uid()
));
