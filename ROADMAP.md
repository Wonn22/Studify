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

### P2 — Social Layer (Profiles & Friendships)
- [x] **P2-A** — Public Profile Page (`/profile/:id`) with own vs public profile handling
- [x] **P2-B** — Real data on profiles: actual groups for "Ongoing Projects", real member counts on Dashboard
- [x] **P2-C** — Connections Page (`/connections`) with Pending incoming/outgoing + Friends list
- [x] **P2-D** — Cancel Friend Request (`cancelFriendRequest()` helper + UI in ProfilePage and FindPage)

### P3 — Notifications & Real-time
- [x] **P3-A** — Notifications system: `notifications` table, RLS, Navbar dropdown with badge
- [x] **P3-B** — Real-time subscriptions on Navbar (notifications), KanbanBoard (tasks), BrowseSessionsPage (join requests), ConnectionsPage (friendships)

### P4 — Groups & Sessions Hardening
- [x] **P4-A** — Group Join Requests: `group_join_requests` table, private group flag, request/accept/decline flow
- [x] **P4-B** — Group Ownership & Admin: `groups.created_by`, creator-only update/delete RLS, admin can remove members
- [x] **P4-C** — Group Status Functionality: Completed = read-only mode, Paused = banner warning, hide completed by default

### P5 — Code Quality & Type Safety
- [x] **P5-A** — Strip console logs: removed 11 statements from 5 frontend files
- [x] **P5-B** — TypeScript cleanup: created `frontend/src/types/index.ts`, removed `any` from 6 files
- [x] **P5-C** — Error handling: fixed empty catch blocks, replaced silent swallow with user-facing alerts

---

## 🚧 In Progress / Planned

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
| Frontend | 0 console statements, 0 hardcoded data spots, 0 `any` types remaining in audited files, 0 missing error handlers in audited files |
| Backend | 13 console statements, unwrapped async in all Socket.IO handlers, profile spoofing risk, no rate limiting |
| Database | All required tables created, some indexes missing, missing constraints, realtime enabled for all tables |
