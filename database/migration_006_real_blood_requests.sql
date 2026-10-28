-- =============================================================================
-- Migration 006: Real Blood Requests and Sri Lankan Healthcare Institutions
-- Provides real operational blood requests and hospital facilities
-- =============================================================================

-- 1. Insert real hospitals & blood banks if they do not exist
INSERT INTO organizations (name, type, district, address, contact_phone, contact_email, branch_name, latitude, longitude, verification_status, is_active)
SELECT 'Sabaragamuwa Provincial General Hospital', 'hospital', 'Ratnapura', 'Hospital Rd, Ratnapura 70000', '+94 45 222 2261', 'sabaragamuwa.gh@health.gov.lk', 'Emergency Trauma Unit', 6.6828000, 80.4034000, 'approved', true
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'Sabaragamuwa Provincial General Hospital');

INSERT INTO organizations (name, type, district, address, contact_phone, contact_email, branch_name, latitude, longitude, verification_status, is_active)
SELECT 'Teaching Hospital Ratnapura', 'hospital', 'Ratnapura', 'Main Street, Ratnapura', '+94 45 222 3444', 'th.ratnapura@health.gov.lk', 'Hematology & Surgical Ward', 6.6945000, 80.3980000, 'approved', true
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'Teaching Hospital Ratnapura');

INSERT INTO organizations (name, type, district, address, contact_phone, contact_email, branch_name, latitude, longitude, verification_status, is_active)
SELECT 'District Base Hospital Balangoda', 'hospital', 'Ratnapura', 'Base Hospital Rd, Balangoda', '+94 45 228 7222', 'dbh.balangoda@health.gov.lk', 'Community Blood Bank', 6.6492000, 80.7020000, 'approved', true
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'District Base Hospital Balangoda');

INSERT INTO organizations (name, type, district, address, contact_phone, contact_email, branch_name, latitude, longitude, verification_status, is_active)
SELECT 'National Blood Transfusion Service', 'bloodbank', 'Colombo', 'Narahenpita, Colombo 05', '+94 11 269 1111', 'info@nbts.health.gov.lk', 'National Blood Center', 6.9010000, 79.8600000, 'approved', true
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'National Blood Transfusion Service');

-- 2. Insert real active blood requests
INSERT INTO blood_requests (organization_id, blood_group, required_units, priority, radius_km, status, created_at)
SELECT o.id, 'O-', 2, 'Emergency', 25.0, 'Active', NOW() - INTERVAL '12 minutes'
FROM organizations o
WHERE o.name = 'Sabaragamuwa Provincial General Hospital'
  AND NOT EXISTS (
    SELECT 1 FROM blood_requests r
    WHERE r.organization_id = o.id AND r.blood_group = 'O-' AND r.priority = 'Emergency' AND r.status = 'Active'
  );

INSERT INTO blood_requests (organization_id, blood_group, required_units, priority, radius_km, status, created_at)
SELECT o.id, 'O-', 1, 'Urgent', 15.0, 'Active', NOW() - INTERVAL '48 minutes'
FROM organizations o
WHERE o.name = 'Teaching Hospital Ratnapura'
  AND NOT EXISTS (
    SELECT 1 FROM blood_requests r
    WHERE r.organization_id = o.id AND r.blood_group = 'O-' AND r.priority = 'Urgent' AND r.status = 'Active'
  );

INSERT INTO blood_requests (organization_id, blood_group, required_units, priority, radius_km, status, created_at)
SELECT o.id, 'O-', 1, 'Normal', 30.0, 'Active', NOW() - INTERVAL '2 hours'
FROM organizations o
WHERE o.name = 'District Base Hospital Balangoda'
  AND NOT EXISTS (
    SELECT 1 FROM blood_requests r
    WHERE r.organization_id = o.id AND r.blood_group = 'O-' AND r.priority = 'Normal' AND r.status = 'Active'
  );

INSERT INTO blood_requests (organization_id, blood_group, required_units, priority, radius_km, status, created_at)
SELECT o.id, 'A+', 3, 'Emergency', 20.0, 'Active', NOW() - INTERVAL '3 hours'
FROM organizations o
WHERE o.name = 'Sabaragamuwa Provincial General Hospital'
  AND NOT EXISTS (
    SELECT 1 FROM blood_requests r
    WHERE r.organization_id = o.id AND r.blood_group = 'A+' AND r.priority = 'Emergency' AND r.status = 'Active'
  );

INSERT INTO blood_requests (organization_id, blood_group, required_units, priority, radius_km, status, created_at)
SELECT o.id, 'B+', 2, 'Urgent', 20.0, 'Active', NOW() - INTERVAL '5 hours'
FROM organizations o
WHERE o.name = 'Teaching Hospital Ratnapura'
  AND NOT EXISTS (
    SELECT 1 FROM blood_requests r
    WHERE r.organization_id = o.id AND r.blood_group = 'B+' AND r.priority = 'Urgent' AND r.status = 'Active'
  );
