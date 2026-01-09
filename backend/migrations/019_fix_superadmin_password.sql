-- Migration 019: Fix Superadmin Password Hash
-- Ensures the superadmin account exists with correct password hash for Admin123!

-- Update existing superadmin or insert if not exists
INSERT INTO superadmins (email, password_hash, first_name, last_name, is_active)
VALUES (
    'admin@rozitech.com',
    '$2a$10$dykFnc11rzhGdciL7cdPNew5LmN4N16fbbqsCST0MPG92ueFtmLn.',
    'Rozitech',
    'Admin',
    true
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = '$2a$10$dykFnc11rzhGdciL7cdPNew5LmN4N16fbbqsCST0MPG92ueFtmLn.',
    is_active = true,
    updated_at = NOW();
