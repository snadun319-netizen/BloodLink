-- Optional residential description; matching continues to use coordinates.
ALTER TABLE donor_profiles ADD COLUMN IF NOT EXISTS address TEXT;
