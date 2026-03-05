ALTER TABLE employees ADD CONSTRAINT entitlement_range CHECK (entitlement >= 0 AND entitlement <= 365);
ALTER TABLE employees ADD CONSTRAINT name_length CHECK (char_length(name) <= 100);
ALTER TABLE stores ADD CONSTRAINT store_name_length CHECK (char_length(name) <= 50);