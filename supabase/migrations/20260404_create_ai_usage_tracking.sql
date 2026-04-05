-- Create AI usage tracking table
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL, -- 'campaign', 'town', 'shop', 'item'
  prompt TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  estimated_cost DECIMAL(10, 6) NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = dm_id);

CREATE POLICY "Users can insert their own AI usage"
  ON ai_usage FOR INSERT
  WITH CHECK (auth.uid() = dm_id);

-- Create index for faster queries
CREATE INDEX idx_ai_usage_dm_id ON ai_usage(dm_id);
CREATE INDEX idx_ai_usage_created_at ON ai_usage(created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER set_ai_usage_updated_at
  BEFORE UPDATE ON ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
