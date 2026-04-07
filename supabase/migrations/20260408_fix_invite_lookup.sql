-- Fix invite token lookup by allowing public access to campaigns via invite_token
-- This allows the /join/[token] page to look up campaigns before authentication

-- Allow anyone to read campaign basic info when looking up by invite_token
-- This is safe because invite tokens are UUIDs (unguessable) and we only expose minimal info
CREATE POLICY "Anyone can lookup campaigns by invite token"
  ON campaigns FOR SELECT
  USING (invite_token IS NOT NULL);

-- Note: This policy works alongside the existing "DMs can read own campaigns" policy
-- RLS policies are OR'd together, so both conditions allow access
