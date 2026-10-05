# Redgum Tutoring Scheduling System - Frontend

React frontend for managing the Redgum Tutoring centre's schedule, bookings, student records, tutor profiles, and availability. Records are loaded from and saved to a separate backend API; this repository contains the browser application only.

| Project role | Team member |
| --- | --- |
| Lead Frontend Developer | Avindya Fernando |
| Project Manager | Nelvin Niklaus |
| Lead Backend Developer | Thevindu Hennayake |
| Client / Owner | Helen Vasquez |

Developed for Southern Cross University (SCU), Master of Information Technology.

## Current features

### Schedule and bookings

- Weekly whiteboard covering Tuesday to Saturday, with a daily view, date picker, previous/next navigation, and current-day highlighting.
- Detailed/minimal card layouts, student/tutor search, tutor filtering, and a print-friendly schedule.
- Create bookings with a student, tutor, shared subject, date, start time, and a duration of 60 or 90 minutes.
- Open session details and switch into edit mode to update booking information, status, administrative notes, and lesson notes, or discard unsaved edits.
- Copy a selected week forward by seven days after confirming source and destination. The result displays the backend's copied/skipped counts and opens the destination schedule.

### All sessions

- Session table with Booked, Attended, Cancelled, and Missed summary counts and status filters.
- Search by student, tutor, or subject; sessions are sorted by date and time, newest first.
- Date-range filtering with a calendar, manual inputs, This week/This month presets, and a clear action. Applied dates are sent to the API.
- Quick actions to mark booked sessions as Attended, Missed, or Cancelled.

### Student directory

- Search by student name, guardian contact details, or subjects, with active/inactive/all filters.
- Split directory/detail view showing subjects, status, guardians, consent flags, availability notes, general notes, and session history.
- Create/edit profiles with multiple guardians. Add/remove guardians and promote a guardian to primary contact; at least one guardian is required.
- Media consent, first aid needed, and progress-sharing fields support Yes, No, and Not specified.
- Assign subjects using a searchable multi-select with selected-subject chips and bulk selection/clearing.
- Deactivate existing students through the edit form.

### Tutor directory and availability

- Tutor cards with contact details, teaching subjects, active/inactive/all filters, and name/subject search.
- Current-week booked-session load compared with each tutor's maximum sessions per week; unavailable capacity data is identified in the UI.
- An Upcoming sessions shortcut opens the current week's schedule filtered to that tutor.
- Create/edit tutors with first name, last name, optional preferred name and display-name preview, phone, teaching subjects, and weekly capacity. Existing tutors can be deactivated.
- Centre-wide Tuesday-to-Saturday availability grid for active tutors.
- Add weekly availability windows with end-after-start validation, or remove a saved window.

### Interface feedback

- Responsive layout with desktop sidebar and mobile bottom navigation.
- Shared forms, toast notifications, loading/empty/error states, and retry controls for failed data loads.
- A global loading dialog tracks overlapping API requests. Save controls prevent duplicate submissions while requests are pending.
- Backend validation messages appear in the relevant form or action area.

## Run locally

### Prerequisites

- Node.js compatible with the installed Vite version: `^20.19.0 || >=22.12.0` (from Vite's package metadata).
- npm, included with Node.js.
- The Redgum backend running with its database configured. Backend startup and database setup belong to the backend repository.

### Start the application

Run these commands from the repository root:

```bash
npm ci
npm run dev
```

`npm ci` installs the versions recorded in `package-lock.json`. Open the URL printed by Vite, normally `http://localhost:5173/`. Vite may choose another port if that port is occupied.

By default, start the backend at `http://localhost:5000`. Vite forwards development requests from `/api` to `http://localhost:5000/api`. The frontend can start without the backend, but its data screens require a reachable API and display errors when requests fail.

### Configure the API URL

The default development proxy works without an environment file. To configure the URL explicitly, copy the supplied example:

```powershell
# Windows PowerShell
Copy-Item .env.example .env.local
```

```bash
# macOS / Linux
cp .env.example .env.local
```

Edit `.env.local` to use the development proxy:

```dotenv
VITE_API_BASE_URL=/api
```

or an absolute backend URL, including the `/api` prefix:

```dotenv
VITE_API_BASE_URL=https://your-backend.example.com/api
```

Restart Vite after changing environment variables. An absolute URL bypasses the development proxy, so the backend must allow the frontend origin through CORS, including required HTTP methods and headers such as `Content-Type`. `.env.local` is ignored by Git. `VITE_` variables are bundled into browser code and must not contain secrets.

### Build and preview

```bash
npm run build
npm run preview
```

The production build is written to `dist/`. Preview serves that build locally; use the printed URL, normally `http://localhost:4173/`.

The `/api` proxy in `vite.config.js` applies to the development server. For production or local preview, set an absolute `VITE_API_BASE_URL` before building, or provide a same-origin `/api` reverse proxy in the hosting environment. Without an override, production code defaults to `http://localhost:5000/api`. Environment values are resolved at build time, so changes require rebuilding.

### Available commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install dependencies from the lockfile |
| `npm run dev` | Start Vite with hot module replacement |
| `npm run build` | Generate the production bundle in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run Oxlint, including configured React rules |
| `npm test` | Run the Node.js service integration tests |

If PowerShell reports that `npm.ps1` cannot run because scripts are disabled, use `npm.cmd` in place of `npm`, for example `npm.cmd ci` and `npm.cmd run dev`.

## Technical overview

### Stack and architecture

The app uses React 19, React DOM, JavaScript ES modules, Vite 8 with the React plugin, and custom CSS. Oxlint provides static checks, and the built-in Node.js test runner covers service behaviour.

`src/main.jsx` mounts the app in React Strict Mode. `App.jsx` owns navigation, forms, filters, and data state using React hooks. Navigation switches views within the app without a routing library. Reusable components handle the date-range picker, student fields, subject selection, and loading dialog.

```text
React views and forms -> domain services -> shared fetch client -> backend API
```

Domain services map backend records into UI-friendly values and construct payloads. Successful writes trigger data refreshes. Effect-based reads use `AbortController` to cancel obsolete requests when the active view or selection changes. Persistent records are owned by the backend; the frontend holds in-memory UI state and does not store records in localStorage.

### Shared API client

`src/services/apiClient.js` exposes `get`, `post`, `put`, `patch`, and `delete`, also exported through `src/services/index.js`. Paths are relative to the configured API root, so callers use `Sessions` rather than repeating `/api`.

- Options support `query`, `headers`, and an abort `signal`. Query arrays use repeated keys; null/undefined values are omitted.
- Bodies use JSON by default; `FormData` is supported.
- Successful responses return parsed JSON, text, or `null` for an empty body.
- `ApiError` preserves HTTP `status` and response `data`, including backend validation details. Network errors have status `0`; abort errors retain their original cancellation behaviour.
- Request activity is counted centrally and observed by `LoadingScreen` through `useSyncExternalStore`.

Example:

```js
import { apiClient } from './services/index.js';

const sessions = await apiClient.get('Sessions', {
  query: { startDate: '2026-10-06', endDate: '2026-10-10' },
});
```

### Backend routes used by the frontend

Paths below are relative to `/api`; `{id}` values are backend record IDs.

| Area | Method and route | Purpose |
| --- | --- | --- |
| Schedule | `GET Sessions/week-schedule?weekStart=YYYY-MM-DD` | Load the selected week |
| Schedule | `POST Sessions/copy-week-forward` | Copy a week using a `{ weekStart }` body |
| Sessions | `GET Sessions`, `GET Sessions/{id}` | List sessions or load details |
| Sessions | `POST Sessions`, `PUT Sessions/{id}` | Create or edit a booking |
| Sessions | `PATCH Sessions/{id}/status` | Update only the status |
| Student history | `GET Sessions/student/{id}/history` | Load a student's sessions |
| Students | `GET Students`, `GET Students/{id}` | Load directory or full profile |
| Students | `POST Students`, `PUT Students/{id}`, `PATCH Students/{id}/deactivate` | Create, edit, or deactivate |
| Tutors | `GET Tutors`, `GET Tutors/{id}`, `GET Tutors/{id}/subjects` | Load tutors, profiles, and subjects |
| Tutor capacity | `GET Tutors/{id}/schedule?weekStart=YYYY-MM-DD` | Count current-week booked sessions |
| Tutors | `POST Tutors`, `PUT Tutors/{id}`, `PATCH Tutors/{id}/deactivate` | Create, edit, or deactivate |
| Availability | `POST Tutors/{id}/availability`, `DELETE Tutors/{id}/availability/{availabilityId}` | Add or remove a window |

For older backend deployments, a `404` from the dedicated student-history route falls back to loading all sessions and filtering by student. Other errors are reported without that fallback. Student history is independent of the All sessions date filter.

### Data conventions and validation

- Calendar calculations use local dates with Monday as the start of the week. The weekly board displays Tuesday through Saturday. API dates use `YYYY-MM-DD`; time payloads use `HH:mm:ss`.
- Booking payloads use numeric IDs. Session statuses are lowercase in API payloads and title case in the UI.
- New bookings use active students/tutors and subjects shared by the selected student and tutor. Existing bookings retain their current selections for editing.
- Student payloads preserve existing guardian IDs, nullable consent flags, and subject IDs. The first guardian in the submitted array becomes primary.
- Availability uses numeric ISO weekdays (`2` for Tuesday through `6` for Saturday). The frontend checks required values and end-after-start order; scheduling and overlap decisions are handled by the backend, with returned errors shown in the UI.

### Current integration limits

- Rescheduling uses the session edit form; schedule cards do not support drag-and-drop.
- Inactive students/tutors cannot be reactivated through the current frontend/API workflow.
- Tutor first/last/preferred-name inputs are combined into the backend's `tutorName` field; those name parts are not persisted separately.
- Subject choices come from subjects already attached to backend student/tutor records; there is no separate subject-management page.
- The shared client currently has no authentication flow or token handling configured.

## Project layout

```text
src/
  App.jsx                    Main views, navigation, forms, and state
  main.jsx                   React entry point
  index.css                  Shared styling and responsive/print layouts
  DateRangePicker.jsx        Calendar and date-range filter
  StudentFields.jsx          Student profile and guardian fields
  SubjectMultiSelect.jsx     Searchable subject selection
  LoadingScreen.jsx          Global API activity dialog
  services/
    config.js                API base URL selection
    apiClient.js             Shared HTTP client and ApiError
    index.js                 Shared client exports
    requestActivity.js       Pending-request tracking
    scheduleDates.js         Calendar helpers and date presets
    sessionsService.js       Schedule, bookings, status, and history
    studentsService.js       Student API calls, mappings, and validation
    tutorsService.js         Tutors, capacity, and availability
tests/
  integration.test.js        Service tests using mocked fetch responses
  browser-smoke.cjs          Optional browser workflow checks
  fixtures/browser.js        In-memory API fixtures for browser checks
public/                      Static icons and favicon
index.html                   HTML shell
vite.config.js               React plugin and development API proxy
.env.example                 Example API configuration
```

`npm test` runs without a live backend and checks request contracts, data preservation, date handling, cancellation, errors, availability, and loading activity. The optional browser smoke script also requires the `chrome-devtools` CLI and a running Vite server; usage is documented at the top of `tests/browser-smoke.cjs`.

## Troubleshooting

- **Unable to reach the server:** Check that the backend is running, its port matches the proxy or configured URL, and the URL includes `/api`.
- **CORS errors with an absolute URL:** Allow the actual frontend origin on the backend, including its port.
- **API configuration appears unchanged:** Restart Vite after editing `.env.local`; rebuild when testing a production bundle.
- **No subject options when booking:** Confirm that the selected student and tutor have matching subject IDs in backend records.
- **Empty schedule:** Check the selected week and filters, then confirm the backend contains sessions for Tuesday through Saturday.
