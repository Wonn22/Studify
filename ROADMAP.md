# Studify Roadmap

> Last updated: 2026-06-06

## Legend
- **P0** — Infrastructure / critical fixes
- **P1** — Core feature (Kanban)
- **P2** — Social layer (profiles, friendships)
- **P3** — Notifications & real-time
- **P4** — Groups & sessions hardening
- **P5** — Code quality & type safety
- **P6** — Backend hardening
- **P7** — Database & schema improvements

---

## ✅ Completed

### P0 — Infrastructure Fixes
- [x] Fix `session_join_requests` table + indexes + RLS
- [x] Fix `session_participants` RLS so hosts can add approved requesters
- [x] Compact `CreateSessionModal` to fit viewport without zoom

### P1 — Interactive Kanban Board
- [x] Add `@dnd-kit/core` + `@dnd-kit/sortable`
- [x] Drag-and-drop between columns
- [x] Inline title edit, member assignee dropdown, delete confirmation
- [x] Extract `TaskCard.tsx`

### P2-A — Public Profile Page (`/profile/:id`)
- [x] Add `/profile/:id` route
- [x] Profile page handles both own profile and public profiles
- [x] Friendship helpers in `dataAccess.ts` (`getFriendshipStatus`, `sendFriendRequest`, `acceptFriendRequest`)
- [x] Public profile shows Add Friend / Accept / Message buttons
- [x] FindPage uses shared helpers + links to public profiles

---

## 🚧 In Progress / Planned

### P2-B — Real Data on Profiles
**Problem:** Profile page shows hardcoded fake projects and location.
- Replace static "Semantic Graph Mapping" / "Studify System Architecture" cards with actual groups the user participates in.
- Replace hardcoded `"Binus, Alam Sutera"` with real location from `profiles` (or remove if not stored).
- Dashboard session cards use `Math.random()` for member counts — fetch real participant counts.

**Files:** `ProfilePage.tsx`, `DashboardPage.tsx`

---

### P2-C — My Connections / Friend List Page
**Problem:** There is no place to view all accepted friendships.
- New route `/connections` (or `/friends`).
- List all accepted friendships with avatar, name, major.
- Click to message or view profile.
- Show pending requests (incoming + outgoing).

**Files:** New `ConnectionsPage.tsx`, `App.jsx`, `Navbar.tsx`

---

### P2-D — Cancel Pending Friend Request
**Problem:** "Request Pending" button is disabled with no cancel action.
- Add `cancelFriendRequest(currentUserId, profileId)` helper in `dataAccess.ts`.
- Enable the pending button to cancel the request.
- Apply to both `ProfilePage.tsx` (public profile view) and `FindPage.tsx`.

**Files:** `dataAccess.ts`, `ProfilePage.tsx`, `FindPage.tsx`

---

### P3-A — Notifications System
**Problem:** All social interactions happen silently. Users must refresh to discover new activity.
- Create `notifications` table:
  ```sql
  id uuid primary key default gen_random_uuid()
  recipient_id uuid -> profiles.id
  sender_id uuid -> profiles.id (nullable)
  type text -- 'friend_request', 'friend_accepted', 'session_join_request', 'group_invite', 'task_assigned'
  reference_id uuid -- links to the related entity
  message text
  is_read boolean default false
  created_at timestamptz default now()
  ```
- RLS: users can only read their own notifications.
- Frontend: notification bell in `Navbar.tsx` with dropdown.
- Mark as read / mark all as read.

**Files:** `sql/create_notifications.sql`, `Navbar.tsx`, new `NotificationDropdown.tsx`

---

### P3-B — Real-time Updates (Supabase Realtime)
**Problem:** Tasks, session join requests, and friendships require manual refresh.
- Subscribe to `postgres_changes` on:
  - `tasks` — update Kanban board live when task status/assignee changes
  - `session_join_requests` — host sees new join requests without refresh
  - `friendships` — user sees accepted requests without refresh
- Keep Socket.IO for chat (already working).

**Files:** `KanbanBoard.tsx`, `BrowseSessionsPage.tsx`, `FindPage.tsx`, `ProfilePage.tsx`

---

### P4-A — Group Join Requests
**Problem:** `group_participants` INSERT policy allows any user to join any group instantly. No approval flow.
- Create `group_join_requests` table (mirror of `session_join_requests`).
- Add `groups.is_private boolean default false`.
- Public groups: instant join (keep current behavior).
- Private groups: request → approve/decline flow.
- Group owner sees pending requests and can approve/decline.

**Files:** `sql/create_group_join_requests.sql`, `GroupsPage.tsx`, `ProjectWorkspace.tsx`

---

### P4-B — Group Ownership & Admin
**Problem:** `groups` table has no `created_by` column. No concept of group admin.
- Add `groups.created_by uuid -> profiles.id`.
- Add `group_participants.role text` (`'admin' | 'member'`).
- Update RLS so only admins can update group details or remove members.
- Migration to set `created_by` on existing groups (from first participant or manually).

**Files:** `sql/add_group_ownership.sql`, `ProjectWorkspace.tsx`, `GroupsPage.tsx`

---

### P5-A — Remove `console.log` / `console.error`
**Problem:** Project policy bans console logs in production code. 14+ instances remain.
- Strip all `console.log`, `console.error`, `console.warn` from `frontend/src/`.
- Strip all from `backend/index.ts` (or replace with structured logger later).
- Exception: backend startup log (`Server running on port...`) is acceptable.

**Files:** All `.tsx`, `.ts` in `frontend/src/` and `backend/index.ts`

---

### P5-B — TypeScript Cleanup (Remove `any`)
**Problem:** 24+ instances of `any` types across 11 files.
- Define proper interfaces for:
  - `Session`, `Group`, `Message`, `Task`, `Resource`, `Friendship`
- Replace `useState<any[]>`, `catch (err: any)`, and function parameter `any`s.
- Add shared types file: `frontend/src/types/index.ts`.

**Files:** `BrowseSessionsPage.tsx`, `DashboardPage.tsx`, `FindPage.tsx`, `GroupsPage.tsx`, `ProjectWorkspace.tsx`, `MessagesPage.tsx`, plus components.

---

### P5-C — Missing Error Handling
**Problem:** Many Supabase queries ignore errors or have empty catch blocks.
- `BrowseSessionsPage.tsx` line 84: empty catch block.
- `DashboardPage.tsx`: multiple unchecked Supabase errors.
- `FindPage.tsx`: unchecked errors on profile/friendship fetches.
- `MessagesPage.tsx`: missing error handling in `initialize`, `handleSendMessage`, `handleRemoveContact`.
- Add user-facing toast/error state instead of silent failures.

**Files:** Multiple pages (see audit in comments).

---

### P6-A — Backend Error Handling
**Problem:** All Socket.IO async handlers lack top-level try/catch.
- Wrap `io.use` middleware auth check in try/catch.
- Wrap all `socket.on` handlers in try/catch with proper `ack({ success: false, error: ... })`.
- Add global Express error-handling middleware.
- Add graceful shutdown handler (`SIGTERM`, `SIGINT`).

**Files:** `backend/index.ts`

---

### P6-B — Backend Security Hardening
**Problem:** Client can spoof `profiles` data in group messages; no rate limiting.
- Fix `send_group_message` to fetch sender profile server-side instead of trusting client payload.
- Consider rate limiting on Socket.IO events (e.g., max 30 messages/minute per socket).
- Review `.or()` string interpolation — use parameterized PostgREST where possible.

**Files:** `backend/index.ts`

---

### P7-A — Database Indexes
**Problem:** No indexes for common search/filter patterns.
- `profiles`: `(major)`, `(full_name)`, GIN on `interests`
- `sessions`: `(scheduled_at)`, `(subject)`
- `messages`: `(receiver_id)`, `(sender_id)`, `(created_at DESC)`
- `tasks`: `(assignee_id)`, `(status)`, `(group_id, created_at)`
- `session_join_requests`: `(session_id, status)`
- `friendships`: `(status)`

**Files:** `sql/add_search_indexes.sql`

---

### P7-B — Database Constraints
**Problem:** Several CHECK constraints are documented but not created in migrations.
- `tasks.status` CHECK (`'To Do'`, `'In Progress'`, `'Done'`)
- `groups.status` CHECK (if applicable)
- `resources.file_type` CHECK (if applicable)
- `session_join_requests` self-request CHECK
- `friendships` `ON DELETE CASCADE` for orphan prevention (optional)

**Files:** `sql/add_check_constraints.sql`

---

### P7-C — Tasks Ordering (Kanban Persistence)
**Problem:** Kanban board has no persistent ordering within columns.
- Add `tasks.sort_order int4` or `tasks.position float8`.
- Update drag-and-drop to persist new order to database.
- Fetch tasks ordered by `sort_order` within each status column.

**Files:** `sql/add_task_sort_order.sql`, `KanbanBoard.tsx`, `TaskCard.tsx`

---

## 📋 Quick Reference: Audit Sources

| Audit Area | Key Findings |
|---|---|
| Frontend | 14 console statements, 7 hardcoded data spots, 24 `any` types, 8 missing error handlers |
| Backend | 13 console statements, unwrapped async in all Socket.IO handlers, profile spoofing risk, no rate limiting |
| Database | 7 missing tables, 10+ missing indexes, weak RLS on `group_participants`, missing constraints, no realtime for non-chat |
