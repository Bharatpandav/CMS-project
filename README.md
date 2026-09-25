# Complaint Management System (MERN Stack)

A system for users to submit complaints, and staff/admins to track, assign, and resolve them. Built with MongoDB, Express, React, and Node.js.

## Roles

- **user** — submits complaints, sees only their own
- **staff** — sees all complaints, updates status/priority/assignment, adds comments
- **admin** — everything staff can do, plus deleting complaints

## Project Structure

```
cms-project/
├── server/              # Express + MongoDB backend
│   ├── config/          # DB connection, env config
│   ├── controllers/     # Route handler logic
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── middleware/      # Auth, error handling, etc.
│   ├── .env.example
│   ├── server.js
│   └── package.json
├── client/              # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   └── utils/
│   └── package.json
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js (v18+ recommended)
- MongoDB (local install or a free MongoDB Atlas cluster)
- Git

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd cms-project

# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Configure environment variables

Edit `server/.env` (see `.env` for the full list):

```
MONGO_URI= mongodb_url
PORT=your backend port
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:your_client_url
```

### 3. Run in development

```bash
# Terminal 1 — backend
cd server
npm run dev

# Terminal 2 — frontend
cd client
npm run dev
```

## Team workflow

- `main` — stable/deployable branch, protected
- `dev` — integration branch, merge feature branches here first
- `feature/<name>` — one branch per feature (e.g. `feature/auth`, `feature/post-editor`)

Suggested flow: branch off `dev` → PR into `dev` → periodically merge `dev` into `main`.

## Team Working

### Bharat — Repo Owner + Core/Auth
- Repo setup, branch protection, PR reviews, and merging.
- User model, `authController`, `authRoutes`, and JWT middleware.
- Deployment setup later:
  - Backend: Render or Railway
  - Frontend: Vercel or Netlify

### Anshul — Complaint Backend + API
- Refine the Complaint model if new fields are required.
- Implement `complaintController` and `complaintRoutes`.
- Handle complaint CRUD, status updates, comments, and role-based access.
- Add input validation, for example with `express-validator`.
- Maintain a Postman/Thunder Client collection so the frontend team has a clear API reference.

### Arun — Frontend
- Build Auth pages: Login and Register, calling the `/api/auth` routes.
- Build Complaint pages:
  - Submit complaint form
  - Complaint list
  - Complaint detail view with comments
- Implement basic routing and protected routes, redirecting to login when no valid token is available.
- Handle styling, even minimally, using Tailwind CSS or plain CSS.

## Tech Stack

- **Frontend:** React (Vite), React Router, Axios
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose ODM)
- **Auth:** JWT
