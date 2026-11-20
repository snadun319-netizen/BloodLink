-- District selection routes donor blood group verification to the local bank admin.
ALTER TABLE donor_profiles ADD COLUMN IF NOT EXISTS district VARCHAR(50);
CREATE INDEX IF NOT EXISTS donor_profiles_district ON donor_profiles(district);
