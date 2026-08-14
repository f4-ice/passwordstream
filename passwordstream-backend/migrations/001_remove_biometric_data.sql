-- PasswordStream no longer collects or authenticates with facial descriptors.
-- Applying this migration permanently deletes legacy biometric templates.
ALTER TABLE users DROP COLUMN IF EXISTS face_descriptor;
DROP TABLE IF EXISTS site_config;
