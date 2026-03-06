# BS Computer Science Attendance Portal

A modern, responsive attendance portal built as a secure single-page web app.

## Implemented Features

- Secure login screen with email/password, role-based authorization (`teacher`/`admin`), encrypted password hashing, and logout.
- Dashboard with teacher identity, subject list count, total students (57), today's summary, quick action buttons, and attendance charts.
- Subject management (add/edit/delete/search).
- Student database (57 records, including Umer Ilyas and Muhammad Aazmeer).
- Excel-style attendance sheet with sticky header, 10 class columns, click-to-toggle (`P`/`A`) in green/red, and auto attendance percentage.
- Bulk tools: mark all present / mark all absent, auto-save.
- Date + subject attendance sessions with history timeline.
- Attendance reports with sorting (highest/lowest attendance).
- Export options: CSV, Excel-compatible `.xls`, PDF-like downloadable report, plus print.
- Student instant search by name or ID.
- Responsive UI for laptop/desktop/tablet/mobile with scrollable table.
- Low-attendance alerts (<75%) highlighted in attendance and reports.
- Dark mode toggle.

## Tech

- Frontend: HTML + TailwindCSS + Vanilla JavaScript + Chart.js
- Storage/database: Browser `localStorage` (collections for users, students, subjects, attendance records)
- Security: SHA-256 password hashing using Web Crypto API + session token in localStorage

## Default Login

- **Email:** `teacher@bscs.edu`
- **Password:** `Admin@123`

## Run

Open `index.html` directly in your browser, or run a local static server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
