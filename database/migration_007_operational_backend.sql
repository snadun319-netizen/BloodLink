-- Operational workflows. Run transactionally through the migration runner.
ALTER TABLE donor_profiles ADD COLUMN IF NOT EXISTS district VARCHAR(50);
ALTER TABLE notifications ALTER COLUMN request_id DROP NOT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'critical_need';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'urgent';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS request_id INTEGER REFERENCES blood_requests(id) ON DELETE SET NULL;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS confirmed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Closed requests cannot retain a live dispatch mission.
UPDATE notifications n SET closed_at = NOW()
FROM blood_requests r WHERE r.id = n.request_id AND r.status <> 'Active' AND n.closed_at IS NULL;
-- Unique indexes intentionally reject conflicting legacy records instead of deleting them.
CREATE UNIQUE INDEX IF NOT EXISTS notifications_request_donor_unique ON notifications(request_id, donor_id);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_one_active_mission ON notifications(donor_id)
  WHERE response_status = 'accepted' AND closed_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe_unique ON notifications(dedupe_key);
CREATE INDEX IF NOT EXISTS notifications_donor_sent ON notifications(donor_id, sent_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS blood_requests_organization_status ON blood_requests(organization_id, status, id DESC);
CREATE INDEX IF NOT EXISTS donations_donor_date ON donations(donor_id, donation_date DESC, id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS donations_request_donor_unique ON donations(request_id, donor_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS donors_matching ON donor_profiles(blood_group, next_eligible_date) WHERE blood_group_verified AND is_available;

CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png')),
  content BYTEA NOT NULL CHECK (octet_length(content) BETWEEN 1 AND 5242880),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS verification_documents_owner ON verification_documents(owner_id);

CREATE TABLE IF NOT EXISTS coordinator_messages (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  donor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS coordinator_messages_request ON coordinator_messages(request_id, id DESC);

CREATE TABLE IF NOT EXISTS push_devices (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE CHECK (length(token) BETWEEN 20 AND 4096),
  family_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS push_devices_user ON push_devices(user_id);
CREATE TABLE IF NOT EXISTS push_delivery_jobs (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES push_devices(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_until TIMESTAMPTZ,
  UNIQUE(notification_id, device_id)
);
CREATE INDEX IF NOT EXISTS push_delivery_jobs_pending ON push_delivery_jobs(next_attempt_at) WHERE status IN ('pending', 'processing');

CREATE TABLE IF NOT EXISTS download_tickets (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_version INTEGER NOT NULL,
  family_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS download_tickets_expiry ON download_tickets(expires_at);

CREATE TABLE IF NOT EXISTS rate_limit_counters (
  key_hash TEXT PRIMARY KEY,
  total_hits INTEGER NOT NULL CHECK (total_hits >= 0),
  reset_time TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limit_counters_expiry ON rate_limit_counters(reset_time);
