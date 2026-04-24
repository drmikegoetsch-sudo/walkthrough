-- Heal walk_sessions that finished before the completion bug fix.
-- Any in_progress session that already has photos is treated as completed;
-- completed_at falls back to the most recent photo's captured_at.

update walk_sessions ws
set
  status = 'completed',
  completed_at = coalesce(
    ws.completed_at,
    (select max(p.captured_at) from photos p where p.session_id = ws.id),
    now()
  )
where ws.status = 'in_progress'
  and exists (select 1 from photos p where p.session_id = ws.id);
