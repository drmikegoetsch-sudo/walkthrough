-- Add review lifecycle state for completed walkthroughs.
-- in_review (default) → paused ↔ closed, freely transitionable.

alter table walk_sessions
  add column if not exists review_status text not null default 'in_review'
  check (review_status in ('in_review', 'paused', 'closed'));

-- Backfill is covered by the default for existing rows.
