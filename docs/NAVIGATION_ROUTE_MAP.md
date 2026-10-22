# UCMS navigation & route map

This document describes primary routes and expected navigation flows. Authorization is enforced by `ProtectedRoute`, `RoleGate`, and the backend API.

## Public (no login)

| Route | Page | Outbound navigation |
|-------|------|---------------------|
| `/` | Home | About, How It Works, Contact (in-page), Student Login (`?login=1`), Admin Login (`?admin=1` / `?management=1`) |
| `/login` | Redirect | → `/?login=1` |
| `/admin/login` | Redirect | → `/?admin=1` |

## Authentication

| Route | Who | Notes |
|-------|-----|--------|
| `/change-password` | Any authenticated user | Required when `isFirstLogin`; then → role dashboard |

## Unified portal (`PortalShellLayout`)

Requires login + password changed. Dashboard: `/app/dashboard`.

### Student

| Route | Label (nav) | Parent / back |
|-------|-------------|----------------|
| `/app/dashboard` | Dashboard | — |
| `/student/complaints/register` | Register Complaint | Dashboard |
| `/student/complaints` | My Complaints | Dashboard |
| `/student/track` | Track Status | Dashboard (same list as complaints) |
| `/student/complaints/:id` | Detail | My Complaints / Track (via Back + `state.from`) |
| `/app/profile` | My Profile | Dashboard |
| `/student/support` | Support | Dashboard |

### Staff (advisor / HOD / dean / VC)

| Route | Nav | Back |
|-------|-----|------|
| `/{role}/complaints` | Complaints | Dashboard |
| `/{role}/complaints/:id` | Detail | Complaints list |
| `/{role}/categories` | Categories | Dashboard |

### Super Admin (portal)

| Route | Nav |
|-------|-----|
| `/complaints` | All Complaints |
| `/complaints/:id` | Detail |
| `/complaints/categories` | Categories |
| `/users/register`, `/users/bulk` | Register / Bulk |
| `/departments` | Departments |
| `/audit-logs`, `/settings` | Placeholders |

Legacy paths (`/student/dashboard`, `/hod/dashboard`, …) redirect to `/app/dashboard`.

## Management portal (`ManagementLayout`)

Requires `MANAGEMENT_PORTAL_ROLES` + password changed.

| Route | Sidebar |
|-------|---------|
| `/management/dashboard` | Dashboard |
| `/management/users` | All Users |
| `/management/register` | Register User |
| `/management/bulk` | Bulk Registration |
| `/management/departments` | Departments |
| `/management/import-export` | Import / Export |
| `/management/complaints` | All Complaints |
| `/management/complaints/:id` | Detail |
| `/management/categories` | Categories |
| `/management/profile` | Profile |

## Post-login redirects

- Student login (`useLoginSubmit`): `resolvePostLoginPath` → role dashboard (`/app/dashboard` or `/management/dashboard` when applicable) or safe `state.from`.
- Administrator modal (staff): `resolvePostLoginPath` with fallback `getPostLoginPath` → unified `/app/dashboard` (not management).
- Management modal: `getManagementPostLoginPath`.
- Protected route with `state.from`: return to `from` if `canUserAccessPath` allows.

## List backtracking

Complaint list → detail links pass `state.from` (current list URL). `BackButton` on detail prefers that path, then `history.back()`, then list fallback. Status filter and scroll position for staff lists are stored in `sessionStorage` via `saveListUiState` / `readListUiState`.

## Wrong role / URL

`RoleGate`, `ProtectedRoute` (role mismatch), and `StaffRouteGuard` redirect to `getRoleDashboardPath(user)` instead of a dead-end error page.

## Logout

Clears token + stored user; navigates to `/` with `replace`. Protected content must not remain accessible via Back.

## Unknown routes

`*` → `NotFoundPage` with link to homepage or role dashboard.
