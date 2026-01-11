-- ============================================================================
-- Migration 025: Reorder Onboarding Phases
-- New order:
--   Phase 1: Employee File (was Phase 3) - profile completion + document uploads
--   Phase 2: Document Signing (was Phase 1) - sign employment documents
--   Phase 3: Role Clarity (was Phase 2) - understand role and team
--   Phase 4: Policy Acknowledgments (unchanged)
--   Phase 5: Complete (unchanged)
-- ============================================================================

-- Step 1: Use a temporary phase value (100+) to avoid conflicts during swap
-- Update Phase 1 (Document Signing) -> temp Phase 101
UPDATE onboarding_documents SET phase = 101 WHERE phase = 1;
UPDATE onboarding_documents SET document_category = 'temp_phase2_signing' WHERE document_category = 'phase1_signing';

-- Update Phase 2 (Role Clarity) -> temp Phase 102
UPDATE onboarding_documents SET phase = 102 WHERE phase = 2;
UPDATE onboarding_documents SET document_category = 'temp_phase3_acknowledgment' WHERE document_category = 'phase2_acknowledgment';

-- Update Phase 3 (Employee File) -> Phase 1
UPDATE onboarding_documents SET phase = 1 WHERE phase = 3;
UPDATE onboarding_documents SET document_category = 'phase1_employee_file' WHERE document_category = 'phase3_employee_file';

-- Step 2: Now update from temp values to final values
-- Update temp Phase 101 (Document Signing) -> Phase 2
UPDATE onboarding_documents SET phase = 2 WHERE phase = 101;
UPDATE onboarding_documents SET document_category = 'phase2_signing' WHERE document_category = 'temp_phase2_signing';

-- Update temp Phase 102 (Role Clarity) -> Phase 3
UPDATE onboarding_documents SET phase = 3 WHERE phase = 102;
UPDATE onboarding_documents SET document_category = 'phase3_acknowledgment' WHERE document_category = 'temp_phase3_acknowledgment';

-- Step 3: Update employee_onboarding current_phase
-- Employees on Phase 1 (was Document Signing) -> temp 101
UPDATE employee_onboarding SET current_phase = 101 WHERE current_phase = 1;
-- Employees on Phase 2 (was Role Clarity) -> temp 102
UPDATE employee_onboarding SET current_phase = 102 WHERE current_phase = 2;
-- Employees on Phase 3 (was Employee File) -> Phase 1
UPDATE employee_onboarding SET current_phase = 1 WHERE current_phase = 3;
-- Now update temps to final
UPDATE employee_onboarding SET current_phase = 2 WHERE current_phase = 101;
UPDATE employee_onboarding SET current_phase = 3 WHERE current_phase = 102;

-- Step 4: Update phase_statuses JSONB field
-- This requires updating the keys in the JSONB object
UPDATE employee_onboarding
SET phase_statuses = jsonb_build_object(
    'phase1', COALESCE(phase_statuses->'phase3', '{"status":"pending"}'::jsonb),
    'phase2', COALESCE(phase_statuses->'phase1', '{"status":"pending"}'::jsonb),
    'phase3', COALESCE(phase_statuses->'phase2', '{"status":"pending"}'::jsonb),
    'phase4', COALESCE(phase_statuses->'phase4', '{"status":"pending"}'::jsonb),
    'phase5', COALESCE(phase_statuses->'phase5', '{"status":"pending"}'::jsonb)
)
WHERE phase_statuses IS NOT NULL;

-- Done
SELECT 'Migration 025 complete: Onboarding phases reordered' as status;
