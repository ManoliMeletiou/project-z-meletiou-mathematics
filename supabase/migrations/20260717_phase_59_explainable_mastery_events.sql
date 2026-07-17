-- Phase 59: Explainable Mastery Event Model
-- Extends Phase 58e with immutable, auditable mastery evidence tables

BEGIN;

-- Mastery Events (append-only)
CREATE TABLE IF NOT EXISTS project_z_mastery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  course_code text,
  course_skill_code text,
  skill_title text,
  event_type text NOT NULL CHECK (event_type IN ('teaching_check', 'guided_attempt', 'independent_attempt', 'correction', 'checkpoint_success', 'mastery_achieved', 'reflection')),
  outcome text,
  accuracy numeric,
  reflection text,
  generator_version text,
  seed text,
  immutable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_z_mastery_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mastery events" ON project_z_mastery_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mastery events" ON project_z_mastery_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policies (append-only by design)

-- Teaching Check Events
CREATE TABLE IF NOT EXISTS project_z_teaching_check_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mastery_event_id uuid REFERENCES project_z_mastery_events(id),
  check_type text,
  passed boolean,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_z_teaching_check_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their teaching checks" ON project_z_teaching_check_events
  FOR ALL USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_mastery_events_user_skill ON project_z_mastery_events(user_id, course_skill_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mastery_events_type ON project_z_mastery_events(event_type, created_at);

-- RPC to record a mastery event (to be implemented in next increment)
-- This provides a safe server-side entry point

COMMENT ON TABLE project_z_mastery_events IS 'Append-only ledger for all mastery-related events. Core of Project Z explainable mastery system.';

COMMIT;
