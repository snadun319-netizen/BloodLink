-- New and existing open requests require explicit platform approval.
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'Pending'
  CHECK (approval_status IN ('Pending', 'Approved', 'Rejected'));
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS review_reason TEXT;
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS reason VARCHAR(1000) NOT NULL DEFAULT '';
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS department VARCHAR(150) NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS blood_requests_review_queue ON blood_requests(approval_status, status, id DESC);

-- Release legacy dispatches until the request has been reviewed. Do not delete history.
UPDATE notifications n SET closed_at = NOW(), response_status = 'pending'
FROM blood_requests r WHERE n.request_id = r.id AND r.status = 'Active'
  AND r.approval_status = 'Pending' AND n.closed_at IS NULL;
UPDATE push_delivery_jobs j SET status = 'cancelled', lease_until = NULL
FROM notifications n JOIN blood_requests r ON r.id = n.request_id
WHERE j.notification_id = n.id AND r.approval_status <> 'Approved' AND j.status IN ('pending', 'processing');

CREATE TABLE IF NOT EXISTS health_alerts (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  donor_id INTEGER NOT NULL REFERENCES users(id),
  sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  subject VARCHAR(150) NOT NULL CHECK (length(subject) BETWEEN 1 AND 150),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 2000),
  notification_id INTEGER REFERENCES notifications(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS health_alerts_institution ON health_alerts(organization_id, id DESC);
