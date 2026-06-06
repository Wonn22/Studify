alter table public.sessions
  drop constraint if exists sessions_meeting_link_required_check;

alter table public.sessions
  add constraint sessions_meeting_link_required_check
  check (
    meeting_link is not null
    and btrim(meeting_link) <> ''
    and meeting_link ~* '^https?://'
  )
  not valid;
