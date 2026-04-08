# LineUp - Social Calendar PWA

## Overview

**LineUp** is a Progressive Web App (PWA) for organizing social events with friends. Users create events (aperitivo, padel, cena, etc.), invite contacts, propose date/time/venue options, and let everyone vote. Once enough votes are collected, the organizer confirms the event.

The app is mobile-first, Italian language, and uses a black/white/#4A9BD9 color palette.

## User Preferences

- Brand name: **LineUp** (always, no exceptions)
- Language: **Italian** for all UI text
- Color palette: `#4A9BD9` (primary sky blue), `#7CB9E8` (light accent), black, white
- Mobile-first design: max-w-sm centered on desktop
- No auth required — demo user is "Io" (stored in localStorage)

## App Structure

### Routes
- `/` → AppHome (greeting + blob Pianifica FAB + events bell)
- `/impostazioni` → AppImpostazioni (settings: notifiche, caratteri, sfondi, privacy, QR)
- `/calendar` → AppCalendar (monthly grid with event dots, standalone)
- `/events/:id` → AppEventDetail (voting interface)
- `/events/:id/chat` → AppChatDetail (WhatsApp-style chat with event switcher + voting banner)
- `/chat` → AppChatList (WhatsApp-style chat list, one entry per event/group)
- `/scopri` → AppScopri (AI-guided discovery: macro → sub → questions → venues)
- `/profile` → AppProfile (user profile + embedded calendar + collapsible contacts)
- `/admin` → Admin (password-protected, view waitlist)
- `/analytics` → Analytics (password-protected, view page views)

### Key Files
```
client/src/
  App.tsx                     — Router, wraps PWA routes in AppShell
  lib/appUtils.ts             — Shared utilities: parseEvent, ACTIVITIES, CONTACTS, GROUPS, etc.
  components/AppShell.tsx     — Bottom navigation + create event sheet trigger
  pages/
    AppHome.tsx               — Events list, stats header
    AppCalendar.tsx           — Monthly calendar with event dots
    AppCreateEvent.tsx        — 4-step event creation wizard
    AppEventDetail.tsx        — Event detail with date/time/venue voting
    AppChatList.tsx           — List of all event chats
    AppChatDetail.tsx         — Single event chat with real-time polling
    AppProfile.tsx            — User profile, stats, contacts
    Admin.tsx                 — Admin panel (password protected)
    Analytics.tsx             — Analytics page (password protected)
shared/
  schema.ts                   — Drizzle table definitions
server/
  routes.ts                   — REST API endpoints
  storage.ts                  — Database storage layer
client/public/
  manifest.json               — PWA manifest
  sw.js                       — Service worker
```

## Data Model

### Tables
- **app_events** — id, activity, title, status (planning/confirmed), createdBy, participants (JSON), dateOptions (JSON), timeOptions (JSON), venueOptions (JSON), confirmedDate, confirmedTime, confirmedVenue, createdAt
- **app_votes** — id, eventId, voterName, voteType (date/time/venue), voteValue, createdAt
- **app_messages** — id, eventId, senderName, content, createdAt
- **subscribers** — waitlist emails
- **page_views** — page view tracking for analytics

### Demo Seed Data (seeded on first startup)
- Aperitivo (planning) — Io/Giovanni/Elena/Marco — 3 date options, 4 time options, 3 venues — pre-cast votes
- Padel (confirmed) — Io/Giovanni/Marco/Luca — confirmed Gio 20 at 18:00 at Padel Club Roma
- Cena (planning) — Io/Elena/Mary — 2 date options, 3 time options, 3 venues

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/app/events` | List all events |
| POST | `/api/app/events` | Create new event |
| GET | `/api/app/events/:id` | Get single event |
| PUT | `/api/app/events/:id/confirm` | Confirm event with date/time/venue |
| GET | `/api/app/events/:id/votes` | Get votes for event |
| POST | `/api/app/events/:id/votes` | Toggle vote (cast or remove); attendance votes are mutually exclusive |
| GET | `/api/app/events/:id/messages` | Get chat messages |
| POST | `/api/app/events/:id/messages` | Send chat message |
| GET | `/api/app/events/:id/proposals` | Get pending option proposals |
| POST | `/api/app/events/:id/proposals` | Create pending proposal (non-creator) |
| PUT | `/api/app/proposals/:id` | Approve/reject proposal (creator) |
| POST | `/api/subscribers` | Join waitlist |
| POST | `/api/admin/subscribers` | Admin: view subscribers (password) |
| POST | `/api/admin/pageviews` | Admin: view page views (password) |
| POST | `/api/pageviews` | Track page view |

## App Features

### Create Event Flow (4 steps)
1. **Chi** — Select group (Calcetto Sabato, Gruppo Classe, Amici storici) or individual contacts
2. **Cosa** — Pick activity type (11 options with emoji)
3. **Quando** — Multi-select dates (calendar) + multi-select time chips grouped by period (Mattina/Pranzo/Pomeriggio/Aperitivo/Sera)
4. **Dove** — AI-suggested venues for the activity (top 3, with rating/distance/discount)

### Voting System
- Each event in "planning" status has vote bars for dates, times, and venues
- Clicking a bar toggles your vote (POST /api/app/events/:id/votes)
- Results shown as progress bars with voter avatars
- When organizer sees enough votes, they can confirm the event

### Chat
- Real-time polling every 3 seconds
- Messages grouped by sender
- "Io" messages appear right-aligned in blue gradient

### Demo Users
- Current user: "Io" (editable in profile, stored in localStorage)
- Contacts: Giovanni, Elena, Marco, Luca, Mary (with distinct avatar colors)
- Groups: Calcetto Sabato (6), Gruppo Classe (12), Amici storici (8)

## Tech Stack

### Frontend
- React + TypeScript + Vite
- Wouter (routing)
- TanStack React Query (data fetching, 3-5s polling for chat/votes)
- Shadcn/ui + Radix UI + Tailwind CSS
- Lucide React (icons)
- Fonts: Outfit (display), Plus Jakarta Sans (body)

### Backend
- Node.js + Express 5
- Drizzle ORM + PostgreSQL
- No authentication (demo app)

### PWA
- `/public/manifest.json` — App name, theme color, icons
- `/public/sw.js` — Service worker (cache-first for static, network-first for API)
- Meta tags: apple-mobile-web-app-capable, theme-color

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `ADMIN_PASSWORD` — Password for /admin and /analytics pages
- `SESSION_SECRET` — Session secret (available but not actively used)

## Build
- Dev: `npm run dev` (tsx + Vite dev server)
- Build: `npm run build` (Vite client + esbuild server bundle)
- DB: `npm run db:push` (Drizzle schema sync)
