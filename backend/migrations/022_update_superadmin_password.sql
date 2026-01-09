-- Migration 022: Update Superadmin Password
-- Updates the superadmin password to CoreHR2024!

UPDATE superadmins
SET password_hash = '$2a$10$mKMj68Rsovrh12RT2O.FReUxFw5kRrjTRzJO.Ns/oXNIzNHH4/gJq',
    updated_at = NOW()
WHERE email = 'admin@rozitech.com';
