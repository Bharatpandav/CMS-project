# Local testing guide — University CMS

> **Current recommended seed:** `CMS_ALLOW_REMOTE_SEED=1 CMS_CONFIRM_TEST_RESET=1 npm run seed:fresh`  
> Verified credentials (plaintext) are written to **`server/.local/test-credentials.md`** (git-ignored).

## A. Local setup

### Prerequisites

- Node.js 18+
- MongoDB (local **recommended**) or a dedicated **dev/test** Atlas database
- `server/.env` with `MONGO_URI`, `JWT_SECRET`, and optional `PORT` (default `5000`)

### Confirm database target

From `server/`:

```bash
node -e "import('dotenv').then(d=>d.config()); import mongoose from 'mongoose'; await mongoose.connect(process.env.MONGO_URI); console.log('host:', mongoose.connection.host, 'db:', mongoose.connection.name); await mongoose.disconnect();"
```

**Do not seed production.** Seed scripts refuse blocked database names (`production`, `prod`, `live`, …) and refuse **remote** hosts unless you set `CMS_ALLOW_REMOTE_SEED=1` **and** the database name is in the dev allowlist (`test`, `dev`, `cms_dev`, …).

Your current configuration should use:

- **Local:** `MONGO_URI=mongodb://127.0.0.1:27017/cms_dev`
- **Remote dev:** only if the database name is explicitly `test` or similar, with `CMS_ALLOW_REMOTE_SEED=1`

### Start services

```bash
# Terminal 1 — API
cd server
npm run dev

# Terminal 2 — UI
cd client
npm run dev
```

Frontend proxies `/api` to `http://localhost:5000` (see `client/vite.config.js`).

### Seed commands

**Dedicated dev test pack** (recommended — idempotent, only `@cms-dev.test` users + `[DEV-TEST]` complaints):

```bash
cd server
# Local MongoDB:
npm run seed:dev

# MongoDB Atlas / remote dev cluster:
CMS_ALLOW_REMOTE_SEED=1 npm run seed:dev
```

**Optional — reset legacy sample passwords** (`student@sbssu.ac.in`, etc.) to the same dev password and clear first-login flag:

```bash
CMS_ALLOW_REMOTE_SEED=1 CMS_SYNC_LEGACY_SAMPLE=1 npm run seed:dev
```

**Original minimal sample users** (creates only if missing; does not reset passwords):

```bash
CMS_ALLOW_REMOTE_SEED=1 npm run seed:users
```

**Verify passwords (DB + HTTP login if API is running):**

```bash
npm run verify:dev
```

---

## B. Verified credentials

### Primary dev pack (`LocalTest@2026`)

Password for all `@cms-dev.test` accounts: **`LocalTest@2026`**  
(Policy: 8+ chars, upper, lower, number, symbol.)

| Role | Login identifier | Password | Entry | Expected destination | First login? |
|------|------------------|----------|--------|----------------------|--------------|
| Student A | URN `DEV-CSE-A001` or `dev.student.a@cms-dev.test` | LocalTest@2026 | Homepage → Login | `/student/dashboard` | No |
| Student B | `DEV-CSE-A002` / `dev.student.b@cms-dev.test` | LocalTest@2026 | Homepage → Login | `/student/dashboard` | No |
| Student C (ECE) | `DEV-ECE-A001` / `dev.student.c@cms-dev.test` | LocalTest@2026 | Homepage → Login | `/student/dashboard` | No |
| Student (password-change test) | `DEV-CSE-FLOGIN` / `dev.student.firstlogin@cms-dev.test` | LocalTest@2026 | Homepage → Login | `/change-password` | **Yes** |
| Advisor | `dev.advisor.cse@cms-dev.test` | LocalTest@2026 | Homepage → Login as Admin → Administrator | `/advisor/dashboard` | No |
| HOD (CSE) | `dev.hod.cse@cms-dev.test` | LocalTest@2026 | Administrator login | `/hod/dashboard` | No |
| HOD (ECE) | `dev.hod.ece@cms-dev.test` | LocalTest@2026 | Administrator login | `/hod/dashboard` | No |
| Dean | `dev.dean@cms-dev.test` | LocalTest@2026 | Administrator login | `/dean/dashboard` | No |
| VC (`super_admin`) | `dev.vc@cms-dev.test` | LocalTest@2026 | Administrator login | `/vc/dashboard` | No |
| Management (Dean) | `dev.mgmt@cms-dev.test` | LocalTest@2026 | Homepage → Login as Admin → **Management Login** | `/management/dashboard` | No |
| Management (HOD) | `dev.mgmt.hod@cms-dev.test` | LocalTest@2026 | Management Login | `/management/dashboard` | No |

There is **no separate “management” role** in the database; Management Login uses the same JWT auth with roles `super_admin`, `dean`, `hod`, or `advisor`.

### Legacy sample accounts (`seedUsers.js`)

Verified against the connected `test` database (passwords from `server/scripts/seedUsers.js`):

| Role | Email | Password | First login? |
|------|-------|----------|--------------|
| Student | `student@sbssu.ac.in` | Student@123 | Yes → `/change-password` |
| Advisor | `advisor@sbssu.ac.in` | Advisor@123 | Yes |
| HOD | `hod@sbssu.ac.in` | Hod@123 | Yes |
| Dean | `dean@sbssu.ac.in` | Dean@123 | Yes |
| VC | `vc@sbssu.ac.in` | Vc@123 | Yes |

URN for legacy student: `CSE2023-001`.

### Unverified / unknown password

These exist in the database but passwords are **not** documented in the repo:

- `teststudent@sbssu.ac.in` (`TEST2026-001`, first login)
- `teststudent2@sbssu.ac.in` (`TEST2026-002`, first login cleared)
- Bulk/credential test accounts (`bulk*`, `credential*`, `download*`)

Use the **dev pack** above or re-register via Management Portal instead of guessing.

---

## C. Feature test checklist

### Student

- [ ] Login with URN or email
- [ ] First-login account → forced password change
- [ ] Register solo complaint (category → department routing)
- [ ] Private solo (`[DEV-TEST] Private solo complaint`)
- [ ] Group invite pending / accepted (`08` / `09` dev complaints)
- [ ] Profile read-only fields on `/student/profile`

### Staff workflow

- [ ] HOD sees department complaints; accept / reject / assign / escalate
- [ ] Advisor sees assigned complaint (`03`, `05`, `11`)
- [ ] Dean sees escalated (`06`)
- [ ] VC sees VC-level (`07`)
- [ ] Invalid transition returns API error (do not bypass UI)

### Management portal

- [ ] Management Login as `dev.mgmt@cms-dev.test`
- [ ] Dashboard stats, user list, search/filters/pagination
- [ ] Register single user (role hierarchy)
- [ ] Bulk CSV (valid + invalid rows)
- [ ] Edit user / deactivate dedicated test user (not production users)
- [ ] Export CSV / Excel / PDF — confirm no `password` columns

### Authorization

- [ ] Student cannot open `/management/*` or staff dashboards
- [ ] Advisor cannot assign dean-level roles in Management Portal
- [ ] Private complaint hidden from unrelated students

### Exports

- [ ] CSV from `GET /api/users/export`
- [ ] Excel/PDF from Management → All Users (filtered)

---

## D. Dev complaint scenarios

After `npm run seed:dev`, complaints are titled **`[DEV-TEST] …`**:

| # | Title hint | Status / routing |
|---|------------|------------------|
| 1 | Newly submitted | `submitted` → HOD |
| 2 | Accepted by HOD | `accepted` |
| 3 | Assigned to advisor | `assigned` / advisor |
| 4 | Rejected | `rejected` |
| 5 | Resolved | `resolved` |
| 6 | Escalated to Dean | `escalated` / dean |
| 7 | Escalated to VC | `escalated` / vc |
| 8 | Group pending invite | invitation for Student B |
| 9 | Group accepted | Student B participant |
| 10 | Private solo | ECE / private |
| 11 | Audit trail | multiple logs |
| 12 | ECE routing | ECE HOD assignee |

Re-running `seed:dev` removes and recreates **only** `[DEV-TEST]` complaints.

---

## E. Bulk CSV testing

Use Management → Bulk Registration. Template columns must match existing bulk API (name, email, role, department, rollNumber, semester, section as required by role).

Prepare rows for:

- Duplicate URN/email (expect row errors)
- Invalid semester or department
- Valid student in CSE vs ECE

---

## F. Results template (fill after you run locally)

| Area | Status | Notes |
|------|--------|-------|
| `npm run seed:dev` | | |
| `npm run verify:dev` | | |
| Student login | | |
| Admin / Management login | | |
| Complaint workflows | | |
| Management exports | | |

---

**Security:** Never commit `server/.env`. Dev passwords in this file are for **local/test databases only**.
