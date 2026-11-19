# Temporary live logins (VC + Management)

Pre-save these in **MongoDB Atlas** (same `MONGO_URI` as Render) before users can sign in.

---

## 1. Vice Chancellor (register everyone) — **create this first**

Full profile is pre-filled for **My Profile** and login.

| Field | Pre-saved value |
|-------|-----------------|
| Full name | Vandana Kumar |
| Email (login) | `vc.temp@sbssu.in` |
| Employee ID | `VC-EMP-001` |
| Phone | `+91 98765 43210` |
| Date of birth | 15 June 1975 (`1975-06-15`) |
| Department | University Administration |
| Role | Vice Chancellor (`super_admin`) |
| **Initial password** | `Vandana1975` |

Edit defaults in `server/scripts/bootstrapVcDefaults.js` before bootstrap if needed.

**Can register (Management portal):** Students, Advisors, HOD, **Dean**  
(Cannot create another VC from the UI.)

| Login button on homepage | Use |
|--------------------------|-----|
| **Administrator Login** | VC complaint dashboard |
| **Management Login** | Same email — register users |

### Insert VC

```bash
cd server
# server/.env → MONGO_URI = Atlas (same as Render)
CMS_CONFIRM_BOOTSTRAP=1 npm run bootstrap:vc
```

Refresh profile if the email already exists (keeps password unless you add `ADMIN_RESET_PASSWORD=1`):

```bash
CMS_CONFIRM_BOOTSTRAP=1 CMS_BOOTSTRAP_UPDATE=1 npm run bootstrap:vc
```

---

## 2. Management-only (optional, avoids VC confusion)

| | |
|--|--|
| **Email** | `cms.management@sbssu.in` |
| **Initial password** | `CMS1990` |
| **DB role** | `dean` |

**Management Login only.** Registers Students, Advisors, HOD — not Dean or VC.

```bash
CMS_CONFIRM_BOOTSTRAP=1 npm run bootstrap:management
```

---

## Recommended go-live order

1. `bootstrap:vc` → log in as VC → register real Deans/HODs/students → change temp password.  
2. Optionally `bootstrap:management` for a dedicated registration desk account.  
3. Remove or disable temp emails after real accounts exist.

---

## Custom emails

```bash
CMS_CONFIRM_BOOTSTRAP=1 \
  ADMIN_NAME="Arun Kumar" \
  ADMIN_EMAIL=vc@college.edu \
  ADMIN_DOB=1985-06-15 \
  ADMIN_ROLE=super_admin \
  node scripts/createBootstrapAdmin.js
```

Password prints in terminal (e.g. `Arun1985`).

---

## Production CORS (Vercel + Render)

| Platform | Variable | Example |
|----------|----------|---------|
| Render | `CLIENT_URL` | `https://your-app.vercel.app` |
| Render | `NODE_ENV` | `production` |
| Vercel | `VITE_API_URL` | `https://your-api.onrender.com` |

Redeploy both after changing env vars. Login failures with “Failed to fetch” usually mean missing `CLIENT_URL` or API without CORS middleware.