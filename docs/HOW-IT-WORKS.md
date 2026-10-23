# How this project works

## The three programs

```
 Browser  ──►  WEBSITE (React, Vite)        port 5173   draws the screens
    │
    └──────►  API (Node + Express)          port 5000   rules, security, saving
                    │
                    └──►  DATABASE (MongoDB)             the stored records
```

* The **website** only draws screens and collects what you type. It never touches the database.
* The **API** receives a request ("collect this fee"), checks who is asking and whether they may do it, applies the
  rules (no overpaying, no double-issuing the last library copy ...), and saves to the database.
* The **database** is just storage.

They are *separate programs on purpose*, so each can be hosted, restarted and scaled on its own. That is why there are two
terminals. It is not a sign that they are "not connected". The connection is:

1. `frontend/src/api/axios.js` sends every request to `/api/...` and attaches the login token.
2. In development, Vite (`frontend/vite.config.js`) forwards `/api` to `http://localhost:5000`, so the browser sees one site.
3. The API checks the token on every request (`backend/src/middleware/auth.middleware.js`) and the role's permissions
   (`backend/src/utils/permissions.js`).

`npm run dev` in the project root starts both at once.

## What happens when you click "Collect fee"

1. `FeesAdminPage` calls `POST /api/fees/payments` with the student, the fee, the amount and the mode.
2. The API checks your token, then that your role may manage fees (accountant and admins), then the input.
3. `fees.service.js` checks the fee applies to that student and the amount is not above the balance, creates the payment with
   the next receipt number, and notifies the student.
4. The audit log records who did it. The page refreshes its lists and the student's receipt is available as a PDF.

## Who can do what

One table, written twice (they must match; the test suite compares real behaviour for every role):
`backend/src/utils/permissions.js` and `frontend/src/config/permissions.js`.
The website hides what you cannot use. **The API is what actually refuses**, so hiding a button is never the only protection.

## Modules

| Module | What it does |
|---|---|
| Auth | Register with email code, sign in, forgot/reset password, change password, approval of new accounts |
| Admissions | Public application form and status check; staff review, approve, enroll (creates the student record) |
| Academic setup | Schools, programs, subjects (with teacher); a new subject also creates its course and attendance rows |
| Students, Faculty, Hostel, Timetable, Attendance | As before |
| LMS | Courses, study material (links), assignments with submission and grading, auto-graded quizzes |
| Exams and Results | Schedule exams, enter marks, publish; grades, SGPA and CGPA worked out from published marks; marksheet PDF |
| Fees and Payments | Fee structures, collect at the counter, receipts (PDF), student dues, defaulters, online pay (test checkout only) |
| Library | Catalogue, issue, return with fine, renew once; rules set in Settings |
| Transport | Vehicles, routes with stops, who rides where |
| Leave | Student, faculty and HOD leave with approval by the right person |
| Notices, Notifications, Messages | Targeted notices, bell with unread count, private chat |
| Events, Grievance, Certificates | Event registration, tickets with replies, certificate requests with PDF |
| Placements, Alumni | Companies, jobs with CGPA/school eligibility, applications; alumni directory |
| Analytics, Attendance planner, Reports | At-risk students, spreads, "how many classes to reach 75%", CSV reports |
| Audit log, Data health | Who changed what (180 days); record counts and consistency checks without a database tool |

## Looking at (and changing) the database

You do not need database access to see or change data:

* **Change data**: use the screens. Every module has add, edit and delete where its rules allow it.
* **See what is stored**: *Settings > Data health* (admins) shows record counts and consistency checks, and *Audit log*
  shows every change. From the terminal: `npm run db:status` (add `-- users` to list accounts, never passwords).
* **A real database viewer** (optional): `docker compose --profile tools up -d` starts MongoDB and a web viewer at
  http://localhost:8081. Or connect MongoDB Compass to the `MONGO_URI` from `backend/.env`.

## Checks

| Command | What it proves | Needs a database |
|---|---|---|
| `npm test` (backend) | Every route is allowed or refused correctly for all 8 roles; grading, PDF and validation logic | No |
| `npm run check` (root) | All imports and API addresses are valid; every page renders for every role, with and without data | No |
| `npm run test:api` (backend) | About 250 end-to-end checks of every module against a throw-away database | Yes (`TEST_MONGO_URI`) |

## Not built (on purpose)

* File uploads (study material and submissions are links). Needs a storage decision (disk or cloud).
* A real payment gateway. The test checkout is available in development only; production keeps online payment off.
* Refresh tokens / sessions older than the login token's life. You sign in again when it expires.
* Scheduled jobs (automatic fee reminders). Notifications are sent when events happen.
