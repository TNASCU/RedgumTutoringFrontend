# Redgum Tutoring Scheduling System · Frontend (React)

**Lead Frontend Developer:** Avindya Fernando  
**Project Manager:** Nelvin Niklaus  
**Lead Backend Developer:** Thevindu Hennayake  
**Client / Owner:** Helen Vasquez  
**Unit:** Southern Cross University (SCU) · Master of Information Technology

---

## 🌟 Overview

This is the React frontend implementation for the **Redgum Tutoring Scheduling System**, faithfully translated from the prototype HTML/CSS mockup. It provides a complete, modern, reactive interface with local persistence, business rule enforcement (availability validation), and full interactive state management.

### Key Features Implemented:
1. **Weekly & Daily Schedule (Whiteboard View)**
   - Weekly board showing Tuesday to Saturday columns (matching centre operating hours).
   - Day-view navigation with dedicated date picker.
   - Interactive HTML5 drag-and-drop session card movement between days.
   - Live availability verification on drop: automatically prevents scheduling conflicts outside tutor availability.
   - Density toggle (Detailed / Minimal) and real-time search/filtering by student or tutor.
   - Print-friendly layout (`Print week`).

2. **All Sessions Management**
   - Summary statistics cards (Booked, Attended, Cancelled, Missed).
   - Filter by status pill tabs and live search query.
   - Quick one-click status transitions (`Attended`, `Cancelled`).
   - Detailed session edit dialog.

3. **Student Directory & History**
   - Split panel layout: Student table and comprehensive details view.
   - Displays student year level, active status, family contact, and subjects.
   - Dedicated session history tracking past and upcoming sessions for the selected student.
   - Add/edit student modal with automatic ID assignment (`S-0xxx`).

4. **Tutor Directory & Capacity**
   - Grid cards displaying tutor name, phone, teaching subjects, and active status.
   - Visual weekly capacity progress bar and load indicator (e.g. `3 / 8` sessions).
   - "Upcoming sessions" quick shortcut filtering directly to that tutor's bookings.
   - Add/edit tutor modal with automatic ID assignment (`T-0xx`).

5. **Tutor Availability Management**
   - Centre-wide availability grid across all operating days (Tuesday–Saturday).
   - Visual time windows (e.g., `15:30–19:00`) per tutor.
   - Quick delete action (`×`) to remove availability windows.
   - "Add availability" modal with validation (`end time > start time`).

6. **Interactive Modals & Toast Notifications**
   - Unified modal dialog for Sessions, Students, Tutors, and Availability.
   - Form-level error alerts enforcing the tutor availability validation rule.
   - Animated bottom-center toast feedback for all actions.
   - Responsive design with mobile bottom navigation bar.

---

## 🚀 Running the Project Locally

```bash
# 1. Install dependencies (React + Vite)
npm install

# 2. Start the local development server
npm run dev
```

The app will be running at `http://localhost:5173/`.

### Building for Production
```bash
npm run build
```

---

## 📁 File Structure

- `src/App.jsx` - Primary React component containing the complete UI, state management, and availability logic.
- `src/index.css` - Custom design system tokens, typography, layouts, and responsive breakpoints.
- `src/main.jsx` - React entry point mounting to `#root`.
- `index.html` - HTML shell with typography and metadata.

## API service foundation

The shared client lives in `src/services/apiClient.js` and uses native `fetch`.
No additional dependencies are required. The UI still uses its existing local data;
the schedule now loads Tuesday-to-Saturday sessions from the backend. Other pages still use local data.

Development requests use `/api`, proxied by Vite to `http://localhost:5000/api`. To override it, copy
`.env.example` to `.env.local`, update `VITE_API_BASE_URL`, and restart Vite.
Use `/api` for the local proxy or an absolute backend URL including the `/api` prefix. Vite exposes `VITE_` variables
in the browser bundle, so they must not contain secrets. Set the deployed backend
URL when building for production.

Future domain services should import `apiClient` from `src/services/index.js`
and pass paths relative to the API root (without repeating `/api`). The client
provides `get(path, options)`, `delete(path, options)`, and
`post/put/patch(path, body, options)`. Options support `query`, `headers`, and
an AbortController `signal`. Query arrays become repeated parameters; null and
undefined values are omitted. Bodies are JSON by default; FormData is also supported.

Successful responses return parsed JSON, text, or `null` for an empty body.
`ApiError` exposes `status` and `data`, preserving server validation details.
Network errors have status `0`; cancellation retains the original abort error.
Authentication can be configured once the backend's authentication contract is known.

When using an absolute backend URL instead of the development proxy, configure backend CORS
to allow the frontend's origin (normally `http://localhost:5173`) and the required
HTTP methods and headers, including `Content-Type`.
