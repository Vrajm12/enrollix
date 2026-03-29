# Education CRM (Admission Management MVP)

Minimal full-stack CRM for admission counselors to manage leads, pipeline stages, and follow-ups.

## Stack

- Frontend: Next.js + React + Tailwind CSS
- Backend: Node.js + Express + JWT auth
- Database: PostgreSQL + Prisma ORM

## Implemented Features

- JWT login (`Admin`, `Counselor`)
- Role-aware access control on backend routes
- Lead CRUD:
  - Name (required)
  - Phone (required)
  - Email, address, parent contact, course, source
  - Assigned counselor
- Pipeline Kanban view:
  - `Lead`, `Contacted`, `Interested`, `Qualified`, `Applied`, `Enrolled`
  - Drag-and-drop card movement with backend status update
- Lead detail page:
  - Editable lead info
  - Quick actions: `tel:`, `wa.me`, `mailto:`
  - Activity timeline
- Activity logging:
  - Type (`call`, `whatsapp`, `email`, `note`)
  - Notes
  - Timestamp
  - Mandatory next follow-up date
  - Save blocked if follow-up is missing

## Project Structure

- `backend` Express API + Prisma schema
- `frontend` Next.js web app

## API Endpoints

- `POST /auth/login`
- `GET /leads`
- `POST /leads`
- `PUT /leads/:id`
- `PATCH /leads/:id/status`
- `POST /activities`
- `GET /activities/:lead_id`

Additional helper endpoints:
- `GET /leads/:id`
- `GET /users/counselors`
- `GET /auth/me`

## Local Setup

1. Start PostgreSQL:
   - `docker compose up -d`

2. Backend setup:
   - `cd backend`
   - `copy .env.example .env` (Windows) or `cp .env.example .env`
   - `npm install`
   - `npm run prisma:generate`
   - `npm run prisma:migrate`
   - `npm run prisma:seed`
   - `npm run dev`

3. Frontend setup:
   - `cd frontend`
   - `copy .env.example .env.local` (Windows) or `cp .env.example .env.local`
   - `npm install`
   - `npm run dev`

Frontend runs on `http://localhost:3000`, backend on `http://localhost:4000`.

## Seed Credentials

- Admin: `admin@crm.local` / `Password@123`
- Counselor: `counselor@crm.local` / `Password@123`
