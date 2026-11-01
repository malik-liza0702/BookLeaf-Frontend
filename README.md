# BookLeaf Author Support Portal: Frontend

The React single-page app for the BookLeaf Author Support & Communication Portal. It has two interfaces:

- **Author portal**: see your books, royalties and availability, raise support queries, follow replies.
- **Admin (ops) portal**: a triage queue with AI classification, a ticket workspace with AI-drafted replies, internal notes, assignment and overrides.

The app only talks to the BookLeaf backend (`/api/v1`). It holds no AI or API keys. Every endpoint, shape and enum comes from [`API_CONTRACT.md`](./API_CONTRACT.md).

- Every route, hook and component: [`docs/COMPONENTS.md`](./docs/COMPONENTS.md)
- Backend setup, architecture and AI: [`../backend/README.md`](../backend/README.md)
- Every endpoint in detail: [`../backend/docs/API_REFERENCE.md`](../backend/docs/API_REFERENCE.md)

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Build | Vite 5 + React 18 + TypeScript (strict, `noUncheckedIndexedAccess`) | Fast dev server, simple config |
| Routing | React Router v6 | Nested layouts and role guards |
| Server state | TanStack Query v5 | Caching, polling (`refetchInterval`), invalidation, optimistic updates |
| Forms | react-hook-form + zod | Typed validation that mirrors the contract limits |
| Styling | Tailwind CSS 3 + a few hand-rolled primitives | No component library to learn or fight |
| Icons | lucide-react | Tree-shaken SVG icons |

## Getting started

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The backend must be running on `http://localhost:4000`. In development, Vite proxies `/api` to it (`vite.config.ts`), so there is no CORS setup. To proxy to a different backend in dev, set `VITE_PROXY_TARGET=http://host:port`.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR and the `/api` proxy |
| `npm run build` | Type-check (`tsc --noEmit`), then a production build to `dist/` |
| `npm run typecheck` | Type-check only |
| `npm run lint` | ESLint (typescript-eslint, react-hooks, react-refresh) |
| `npm run preview` | Serve the production build locally |

### Environment variables

Copy `.env.example` to `.env.local` if you need to override anything.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` | API base URL baked into the build. Set it to the deployed backend, e.g. `https://api.example.com/api/v1`, when the frontend and backend are on different origins (the backend must then allow the origin via CORS). |
| `VITE_PROXY_TARGET` | `http://localhost:4000` | Dev only: where Vite's `/api` proxy forwards. |

### Demo accounts

The login page has quick-fill buttons for `priya.sharma@email.com` and `admin@bookleaf.com`. The other seeded accounts can be typed in by hand:

| Role | Email | Password | Notes |
| --- | --- | --- | --- |
| Author | `priya.sharma@email.com` | `Author@123` | One book fully paid up, one with royalty pending |
| Author | `sneha.kulkarni@email.com` | `Author@123` | Has a book "In Production - Cover Design" |
| Author | `kavita.deshmukh@email.com` | `Author@123` | Has a book "In Production - Typesetting" |
| Admin | `admin@bookleaf.com` | `Admin@123` | |
| Admin | `ops@bookleaf.com` | `Admin@123` | Second admin, for testing assignment |

### Deployment

`vercel.json` rewrites every path to `index.html` so deep links like `/admin/tickets/abc` work on refresh. Any static host works with an equivalent SPA fallback (Netlify `_redirects`, nginx `try_files`). Set `VITE_API_BASE_URL` at build time, or serve the API under `/api` on the same origin through a reverse proxy. Without it on Vercel, those rewrites return `index.html` for API calls. When the frontend and backend are on different origins, add the frontend's URL to the backend's `CORS_ORIGIN`.

## Routes

| Path | Who | Page |
| --- | --- | --- |
| `/login` | anyone | Sign in, with demo account buttons |
| `/` | anyone | Redirects to the right home for your role, or to `/login` |
| `/author/dashboard` | author | Dashboard (author home): summary tiles, My Books and Queries panels |
| `/author/books` | author | My Books: royalty summary and per-book details |
| `/author/tickets` | author | My Queries list |
| `/author/tickets/new` | author | New query form |
| `/author/tickets/:ticketId` | author | Ticket thread (polls every 5s) |
| `/admin/tickets` | admin | Queue: stats, filters (kept in the URL), sort, pagination (polls every 10s) |
| `/admin/tickets/:ticketId` | admin | Ticket workspace: context, thread, AI draft, reply, notes, triage controls |
| `/admin/authors` | admin | All authors with book, royalty and ticket totals; search (kept in the URL), pagination |
| `/admin/authors/:authorId` | admin | One author: contact details, royalty summary, every book, their tickets |

Route guards (`src/auth/RequireRole.tsx`): signed-out users go to `/login` and return to the page they wanted after signing in. A signed-in user who opens the other role's area is sent to their own home: an author opening `/admin/...` lands on `/author/dashboard`, and an admin opening `/author/...` lands on `/admin/tickets`.

## Project structure

```
src/
  api/            HTTP layer, no React
    client.ts       fetch wrapper: base URL, bearer token, contract-shaped errors -> ApiError, 401 hook
    types.ts        TypeScript mirror of API_CONTRACT.md (enums as const arrays + types)
    auth.ts books.ts tickets.ts admin.ts notifications.ts   one object per resource (authApi, booksApi, ...)
  auth/           AuthContext + AuthProvider (session state), tokenStorage, RequireRole guards
  hooks/          TanStack Query hooks + the central queryKeys factory
  components/     shared UI: Layout, StatusPill, PriorityBadge, AgeIndicator, EmptyState, ErrorState, ...
    ui/             primitives: Button, Badge, Card, Field/Input/Select/Textarea/CharCount, Skeleton, Spinner
    toast/          tiny toast system (provider + useToast)
  features/
    auth/           LoginPage
    author/dashboard/ AuthorDashboardPage
    author/books/   MyBooksPage, BookCard, RoyaltySummary
    author/tickets/ MyTicketsPage, NewTicketPage, AttachmentPicker, AuthorTicketDetailPage, TicketReplyForm, TicketSubmittedCard
    admin/queue/    TicketQueuePage, StatsStrip, QueueFilters, QueueList, useQueueFilters (URL state)
    admin/ticket/   AdminTicketDetailPage and its panels
    admin/authors/  AuthorsPage, AuthorDetailPage (reuses BookCard, RoyaltySummary and QueueList)
  lib/            pure helpers: format (₹, dates, relative age), books, tickets, dates, constants, seenReplies, cn
```

Conventions:

- **Pages fetch, components render.** Feature pages call hooks from `src/hooks`; presentational components take plain props.
- **One error type.** Every failed request becomes an `ApiError` with `status`, `code` (the contract's codes, plus `NETWORK_ERROR` / `BAD_RESPONSE` on the client side), `message` and `details`. UI code never parses responses itself.
- **Central query keys** (`hooks/queryKeys.ts`) are hierarchical: `['tickets', 'list', ...]` and `['tickets', 'detail', id]`. After a write we invalidate the ticket detail, all ticket lists and the admin stats, so every view converges.

## Key UX decisions

### Polling (near real time)

The contract offers polling rather than websockets, so we use TanStack Query's `refetchInterval`:

| View | Interval | Notes |
| --- | --- | --- |
| Author ticket list and open ticket | 5s | Admin replies appear without a refresh |
| Admin queue and stats | 10s | New tickets and classification results flow in |
| Admin open ticket | 10s | Picks up AI classification and other admins' changes |

- Polling pauses in background tabs (TanStack's default `refetchIntervalInBackground: false`) and catches up on window focus. This keeps load at roughly one request per visible tab per interval.
- Detail polling stops after a 4xx (for example a 404 for someone else's ticket) instead of hammering the API.
- The queue uses `placeholderData: keepPreviousData`, so changing a filter or page keeps the old rows on screen (dimmed) instead of flashing a skeleton.
- Polling never overwrites what you are typing. Composer and form text lives in local component state, not in the query cache, so a refetch only updates server-owned data.
- We don't use `?updatedSince=` yet (see limitations). Full refetches of a 20-row page are cheap at this scale.

### AI in the admin workflow

- **Classification.** While `aiStatus === "pending"`, the queue and ticket show *Classifying…* instead of the placeholder `General Inquiry` / `Medium`, so nobody acts on fake values. When classification fails, a small *rules fallback* hint shows that keyword rules, not the model, chose the values. When it succeeds, the ticket sidebar shows the AI's suggested category and priority with confidence and reasoning, plus an *Overridden* badge once an admin changes a value. An override can be reset back to the AI value (`PATCH` with `category: null` / `priority: null`).
- **Reply drafts.** When an admin opens an unresolved ticket, the app calls `POST /tickets/:id/ai-draft` automatically and shows a loading notice above the reply box. The draft is inserted into the box only if it's empty, so text the admin is already typing is never replaced; otherwise *Use AI draft* offers it. *Regenerate* asks for a new one, and a badge shows the model and generation time. Automated warnings and any unfilled `[confirm: …]` placeholders appear next to the box, and sending asks for confirmation first. Resolved and closed tickets don't call the endpoint until the admin asks for a draft. While the reply box holds an AI draft, *Suggest changes* sends its current text and the admin's suggestions to the model and replaces the text with the updated draft. If that fails, the text is left as it was.
- **Graceful degradation.** A template draft (`fallback: true`) is inserted with a notice saying the AI didn't write it. A 503 `AI_UNAVAILABLE` shows a non-blocking notice: "AI draft unavailable. Write your reply manually." Any other draft error shows its message with the same reassurance. The composer stays fully usable. AI can never block replying, just as it never blocks ticket creation on the backend.
- **Provenance.** A reply sent from a draft is sent with `usedAiDraft: true`, even if the admin edited it. The thread then tags it *AI-assisted*, so the team can audit how much AI text reaches authors.
- **Separation.** Authors never see AI fields, categories, priorities or internal notes. The author pages consume only the `AuthorTicket` type, which has none of them.

### Urgency in the queue

- The default sort is *urgency*: unresolved tickets first, then by priority, then oldest first. *Newest* and *oldest* are available too.
- Priority badges are colour-coded and carry icons, so they don't rely on colour alone: Critical red, High orange, Medium amber, Low grey.
- Unresolved Critical rows get a red left border and a light red tint.
- The age indicator turns amber after 48 hours and red after 5 days, but only for unresolved tickets. Resolved tickets are dimmed.
- The stats tiles (open, in progress, critical, unassigned, oldest open) are clickable shortcuts that apply the matching filter. *Oldest open* turns amber or red with the same age thresholds.
- All filters (status, category, priority, assignee, date range, subject search, sort, page) live in the URL. A filtered view survives reloads, can be shared with a teammate, and is restored by *Back to queue*. Search is debounced. Date inputs are converted to whole local days, so the range includes both end dates.

### Edge cases in book data

- **In-production books** (`isInProduction`, null `mrp` / `publicationDate`, zero royalties) get an amber *In production · Cover Design* badge, with the stage parsed from the status. They show *Not yet published*, em dashes instead of ₹0 or "null", "Royalties start once your book is published", and "Listings go live after publication" in place of empty platform chips.
- A book with nothing pending but some earnings shows *All paid up*. A book with no payout yet shows *No payouts yet* instead of an empty date.
- Money uses `Intl.NumberFormat('en-IN')`, giving Indian grouping such as ₹1,23,456. Every formatter returns "—" for null or NaN, so the UI never renders `NaN` or `null`.
- The summary tiles total earned, paid and pending across all titles and split published from in-production counts.

### Raising a query

- *Book* lists the author's own books and defaults to *General / Account Level*. The chosen `bookId` gives the AI draft that book's real figures; if the books can't load, the query can still go in as general.
- *Type of query* is a separate required dropdown with two options, *General* and *Account Level*, sent as `queryType`. Nothing in triage uses it (see limitations).
- Subject (3–150) and description (10–5000) have live character counters and zod validation that mirrors the contract. When the server returns `VALIDATION_ERROR` details, they are mapped back onto the matching fields.
- Attachments are UI only, because the contract has no upload endpoint. You can pick up to 5 files of 10 MB each, see their name and size, and remove them. Duplicates and oversized files are rejected with a message. Only `{ name, size }` metadata is sent.
- On success you land on the new ticket with a confirmation card.
- An author can create 5 tickets an hour by default. Past that, the form shows the server's message and keeps the text.
- Once support has replied, the author can send follow-ups while the ticket is Open or In Progress. Resolved and Closed tickets point them to a new query.
- *New reply* badges on the author's ticket list are tracked per browser (see limitations).
- A toast appears when a reply or status change arrives. Opening a ticket marks its notifications as read.

### General

- Every data view has a loading skeleton, an error state with *Try again*, and an empty state with a next step.
- Buttons show pending spinners and are disabled during requests. Toasts confirm successes and surface errors.
- Form controls have labels, errors are linked with `aria-describedby`, and toasts and status messages use live regions.
- The layout is responsive. The queue collapses from a table-like grid into stacked cards on narrow screens, and the ticket workspace stacks its sidebar under the main column.

## Auth and the token-storage trade-off

The JWT (8h expiry) is stored in `sessionStorage`, so each tab has its own login: author and admin tabs can sit side by side, a session survives reloads of its tab, and a new tab or a reopened browser asks you to sign in again. The trade-off: any XSS on this origin could read it. We reduce the risk by never rendering raw HTML (React escapes everything, and there is no `dangerouslySetInnerHTML`) and by keeping dependencies minimal. In production the stronger option is an `HttpOnly; Secure; SameSite` cookie set by the backend, with CSRF protection. That needs backend changes, so it is out of scope here.

On startup a stored token is checked with `GET /auth/me`, and any failure ends the session, including a backend outage (see limitations). Any 401 from an authenticated request clears the token and the whole query cache, shows a "session expired" toast and redirects to `/login`. Signing in or out also clears the cache, so one user never sees another's cached data.

## Known limitations

- **Attachments are metadata only.** No files are uploaded, because the contract has no upload endpoint.
- **The "New reply" indicator is per browser.** The contract has no read receipts, so the app stores the number of responses seen per ticket in `localStorage`. On a new device every ticket with replies starts as "new".
- **`updatedSince` is unused.** The admin API layer accepts it (`AdminTicketFilters.updatedSince`), but the queue still refetches the current page every 10s. Merging deltas into paginated, sorted pages is complex, and the payoff is small at about 20 rows per page.
- **No websockets or SSE.** Updates take up to 5s for authors and 10s for admins to appear.
- **Optimistic concurrency.** If two admins change the same field at the same time, the last write wins, and the other admin's view corrects itself on the next poll.
- **Type of query is redundant.** The brief asks for one dropdown (book, or General / Account Level). The extra required field isn't used by classification or drafts, and the API requires it.
- **A backend error at startup signs you out.** Any failed `GET /auth/me` on load clears the token, not only a 401, so a free host's cold start can do this.
- **"Raise a query" on a book card doesn't preselect the book.** The author chooses it again in the form.
- **Logins don't carry over to new tabs.** Each tab has its own session (see above).
- **No automated frontend tests.** Verification so far is type-checking, linting and browser checks against the backend. [`docs/COMPONENTS.md`](./docs/COMPONENTS.md#known-gaps) lists further gaps.
- **English and INR only.** Amounts are shown in INR because that is what the data provides, even for US-market platforms.
