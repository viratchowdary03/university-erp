# Virat Chowdary University ERP (MERN)

University ERP built with MongoDB, Express, React and Node.

There are two ways to run it:

* **Demo mode**: only the frontend, with generated sample data. Nothing is stored. Good for looking around.
* **Real mode**: frontend + backend + MongoDB. Accounts, registrations, students, faculty, attendance,
  hostel and everything else are stored in the database.

## Quick start (real mode: everything works)

You need Node 20+ and a MongoDB (a free MongoDB Atlas cluster, or `docker compose up -d mongo`).

```bash
npm run setup                       # installs backend and frontend
cp backend/.env.example backend/.env   # then fill in MONGO_URI and JWT_ACCESS_SECRET (see below)
npm run seed:all                    # first Super Admin + sample university + sample sign-ins (development only)
npm run dev                         # API on :5000 and website on :5173, started together
```

`backend/.env`: `MONGO_URI` (database address), `JWT_ACCESS_SECRET` (a long random text), `SUPER_ADMIN_*` (the first
admin) and optionally `SMTP_*` (email for codes; if empty, codes are printed in the terminal).

Sign in with any seeded account, password `Demo@12345` (list them with `npm run db:status -- users`).

You can still run the two halves yourself: `cd backend && npm run dev` and `cd frontend && npm run dev`.
In development the website talks to `/api` and Vite forwards that to the backend, so no CORS setup is needed.

**Why two programs?** The website draws screens, the API holds the rules and talks to the database. They are
connected by HTTP and a login token. Read [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md) for the full picture.

On a real university's data do **not** run `seed:sample` or `seed:demo-users` (they refuse to run when `NODE_ENV=production`).

## Demo mode (no backend, no database)

Set `VITE_MOCK_AUTH=true` in `frontend/.env` and run only the frontend. Sample data lives in the browser and nothing is
stored. Only the first modules (students, faculty, timetable, attendance, courses, hostel, academic) have demo data; the
rest say that they need the backend. The registration code in demo mode is `123456`.

## Roles and access

| Role | Can open |
|---|---|
| Super Admin, Registrar, Administrator | Every module, for every school |
| Head of School (HOD) | Own school: students, faculty, timetable, attendance, LMS, exams, results (no admissions, fees, hostel, library) |
| Faculty | Own school, teaching only: timetable, attendance, LMS, exams, results |
| Student | Own timetable, attendance, courses, exams, results, fees (and online payment), library, hostel, transport, leave, certificates, grievance, placements, alumni, events, messages |
| Accountant | Fees (collect, structures, receipts), fee reports, events, messages |
| Librarian | Library (catalogue, issue, return), events, messages |

Everyone who registers waits for approval. A Super Admin approves any role; Registrar and Administrator approve
heads of school, faculty, students, accountants and librarians. The table lives in
`frontend/src/config/permissions.js` and `backend/src/utils/permissions.js`.

## Tests and checks

```bash
npm test                 # (root) role permissions of every route for all 8 roles, grading, PDFs, validation. No database.
npm run check            # (root) every import and API address is valid; every page renders for every role. No database.
cd backend && npm run test:api   # about 250 end-to-end checks against an EMPTY throw-away database (TEST_MONGO_URI)
```

`test:api` is never run against `MONGO_URI`: it wipes its database.

## Seeded sign-ins (password `Demo@12345`)

  super_admin  anil.kumar@vcu.edu
  registrar    lakshmi.narayan@vcu.edu
  admin        rakesh.menon@vcu.edu
  accountant   sunita.agarwal@vcu.edu
  librarian    prakash.iyer@vcu.edu
  hod          rahul.nair@vcu.edu
  faculty      riya.gupta@vcu.edu
  student      aarav.shah01@students.vcu.edu
