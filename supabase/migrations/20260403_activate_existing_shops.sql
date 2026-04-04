-- Activate all existing shops that are currently inactive
UPDATE shops SET is_active = true WHERE is_active = false;
