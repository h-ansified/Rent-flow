
-- Enable RLS on all relevant tables
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- 1. PROPERTIES
-- Landlords can do everything with their own properties
CREATE POLICY "Landlords can CRUD own properties" ON properties
FOR ALL USING (auth.uid()::text = user_id);

-- Tenants can view properties they are linked to (via tenants table usually, or just public/read-only if needed?)
-- For now, let's keep strict privacy: Only the owner sees it. 
-- Extending for tenants: Tenants need to see property details for their lease.
CREATE POLICY "Tenants can view their property" ON properties
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tenants 
    WHERE tenants.property_id = properties.id 
    AND tenants.email = (select email from auth.users where id = auth.uid())
  )
);

-- 2. TENANTS
-- Landlords can CRUD their own tenants
CREATE POLICY "Landlords can CRUD own tenants" ON tenants
FOR ALL USING (auth.uid()::text = user_id);

-- Tenants can view their own record
CREATE POLICY "Tenants can view own record" ON tenants
FOR SELECT USING (
  email = (select email from auth.users where id = auth.uid())
);

-- 3. PAYMENTS
-- Landlords can CRUD their own payments
CREATE POLICY "Landlords can CRUD own payments" ON payments
FOR ALL USING (auth.uid()::text = user_id);

-- Tenants can view their own payments (linked via tenant_id)
CREATE POLICY "Tenants can view own payments" ON payments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tenants
    WHERE tenants.id = payments.tenant_id
    AND tenants.email = (select email from auth.users where id = auth.uid())
  )
);

-- 4. EXPENSES
-- Landlords can CRUD their own expenses
CREATE POLICY "Landlords can CRUD own expenses" ON expenses
FOR ALL USING (auth.uid()::text = user_id);
-- Tenants generally don't see expenses unless shared (not in requirement yet)

-- 5. MAINTENANCE REQUESTS
-- Landlords can CRUD their own requests
CREATE POLICY "Landlords can CRUD own maintenance" ON maintenance_requests
FOR ALL USING (auth.uid()::text = user_id);

-- Tenants can view and create requests for their property
CREATE POLICY "Tenants can view own maintenance" ON maintenance_requests
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tenants
    WHERE tenants.id = maintenance_requests.tenant_id
    AND tenants.email = (select email from auth.users where id = auth.uid())
  )
);

CREATE POLICY "Tenants can create maintenance" ON maintenance_requests
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenants
    WHERE tenants.id = maintenance_requests.tenant_id
    AND tenants.email = (select email from auth.users where id = auth.uid())
  )
);

-- 6. PAYMENT HISTORY
-- Landlords CRUD
CREATE POLICY "Landlords can CRUD payment history" ON payment_history
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM payments
    WHERE payments.id = payment_history.payment_id
    AND payments.user_id = auth.uid()::text
  )
);

-- Tenants view
CREATE POLICY "Tenants can view own payment history" ON payment_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM payments
    JOIN tenants ON payments.tenant_id = tenants.id
    WHERE payments.id = payment_history.payment_id
    AND tenants.email = (select email from auth.users where id = auth.uid())
  )
);
