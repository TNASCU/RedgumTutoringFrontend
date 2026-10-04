# Redgum Tutoring Scheduling System · Frontend (React)

**Lead Frontend Developer:** Avindya Fernando  
**Project Manager:** Nelvin Niklaus  
**Lead Backend Developer:** Thevindu Hennayake  
**Client / Owner:** Helen Vasquez  
**Unit:** Southern Cross University (SCU) · Master of Information Technology

## Run locally

Start the ASP.NET Core API on port 5000, then run:

```sh
npm install
npm run dev
```

Development requests use /api through the Vite proxy. To override the backend,
copy .env.example to .env.local and set VITE_API_BASE_URL, including the /api prefix.
Restart Vite after changing it. Set this URL when building for deployment.

## Integrated functionality

- Weekly/day schedules, booking creation, session details/editing and copy-week-forward retain preprod's API integration.
- Bookings are edited through their session form; schedule cards do not support drag-and-drop.
- A shared loading screen appears during service calls and closes when all pending requests complete, fail or are cancelled.
- All sessions loads server records, supports status/search filters and an inclusive date range. This week/month presets use the current local date. Clearing the range requests all records again.
- Attended, missed and cancelled actions use PATCH /Sessions/{id}/status and refresh server data after success.
- Student list, profile, create, update and deactivate use /Students endpoints. Student history loads independently from the sessions-page filter.
- Student/tutor subject selectors search and select real database IDs, showing class labels to distinguish subjects with the same name. Options come from backend student/tutor profiles, with no guessed or hardcoded IDs.
- No seeded records or localStorage fallback is used for server-owned data. Loading, empty and error states are explicit, and requests are cancelled when their view changes.

## Backend compatibility and data preservation

The domain services use the existing shared apiClient, configuration and ApiError
handling. Paths are relative to the API root. Request options accept AbortController
signals, and failures retain backend validation details.

Student history uses GET /Sessions/student/{id}/history when available (the local
StudentEpic backend provides it). On older preprod deployments returning 404 for
that route, it uses GET /Sessions and filters by student ID. Other failures remain
visible and retryable.

Student inputs match the backend DTO: name, guardians, media consent, first aid
needed, share progress, availability notes, notes and subject IDs. Names/emails
allow 100 characters, guardian phone 12, relationship 20, and availability notes
255. Guardian name/phone/relationship are required for every guardian, with at
least one guardian. The first visible guardian is always sent first and becomes
primary on the backend. Users can add/remove guardians or move a guardian to first
position with Make primary. Existing guardian IDs are retained; new ones omit IDs.

Nullable flags support Yes, No and Not specified. New-student defaults match the
backend (media consent false, first aid needed true, share progress false).
School/year inputs are removed because they are not backend fields. Existing Notes
are preserved as free text, including any older school/year lines. Deactivation
uses its separate endpoint; a failed deactivation after a successful profile save
is reported and remains retryable with refreshed guardian IDs.

Tutor availability can be added and removed through POST /Tutors/{id}/availability
and DELETE /Tutors/{id}/availability/{availabilityId}. Times use HH:mm:ss and ISO
weekday numbers. Invalid time ranges are checked in the form; overlap validation
comes from the backend. The grid refreshes after successful writes and retains
slots when deletion fails. Reactivation is not offered for inactive students or tutors. Subject
options are limited to subjects returned by existing profiles because there is no
standalone subject-catalog endpoint.

## Validation

```sh
npm test
npm run lint
npm run build
```

The Node tests cover request contracts, date filtering, history compatibility,
status updates, concurrent request loading, student profile preservation, validation
errors, cancellation and date presets across year/leap-month boundaries.

Optional browser smoke tests require the chrome-devtools CLI, a browser page and a
running Vite server. On Windows:

```sh
chrome-devtools list_pages
node tests/browser-smoke.cjs http://127.0.0.1:5174/ 1
```

The smoke suite injects tests/fixtures/browser.js before app startup. Every /api
request is intercepted in memory; real tutoring records are not changed. It checks
rendered screens, date selection, student create/edit/deactivate, tutor subject IDs,
failed-save retries, status changes, loading, booking edits and copy-week feedback.
The fixture is never imported into the production application.
