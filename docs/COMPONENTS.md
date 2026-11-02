# BookLeaf Frontend Component Guide

How the BookLeaf React app is put together: every route, hook and component, what each one is for, and how they connect to the API.

- **Setup and UX decisions:** see [README.md](../README.md).
- **API details:** see [backend/docs/API_REFERENCE.md](../../backend/docs/API_REFERENCE.md).
- **Accuracy:** checked against the code on 2026-11-02.

## Contents

1. [Architecture](#architecture)
2. [Routes](#routes)
3. [Authentication](#authentication)
4. [API layer](#api-layer)
5. [Data hooks](#data-hooks)
6. [UI primitives](#ui-primitives-srccomponentsui)
7. [Shared components](#shared-components-srccomponents)
8. [Login and not-found pages](#login-and-not-found-pages)
9. [Author portal](#author-portal)
10. [Admin portal](#admin-portal)
11. [Helpers](#helpers-srclib)
12. [Patterns to follow](#patterns-to-follow)
13. [Known gaps](#known-gaps)

## Architecture

The app is a single-page app with two portals, one for authors and one for the admin (ops) team. It is built with Vite, React 18 and TypeScript, using React Router v6, TanStack Query v5, react-hook-form with zod, Tailwind CSS and lucide-react icons.

### Layers

```
Page (src/features)            Fetches data with hooks and composes the screen
  -> Hook (src/hooks)          TanStack Query: caching, polling, invalidation
    -> API object (src/api)    One object per resource; typed requests
      -> apiRequest            Base URL, bearer token, turns failures into ApiError
```

Pages fetch and components render: feature pages call hooks, and presentational components take plain props. UI code never calls `fetch` or parses a response itself.

### Directory layout

```
src/
  main.tsx        Entry point and provider tree
  App.tsx         Route table
  api/            HTTP client, one API object per resource, TypeScript types
  auth/           Session state, route guards, token storage
  hooks/          TanStack Query hooks and query keys
  components/     Shared components
    ui/           Generic primitives (Button, Card, Field, ...)
    toast/        Toast provider and hook
  features/
    auth/         Login
    author/       Dashboard, books, tickets
    admin/        Queue, ticket workspace, authors
  lib/            Pure helpers: formatting, dates, constants
```

### Provider tree

Defined in `src/main.tsx`, outermost first:

```
StrictMode
  QueryClientProvider    staleTime 2s; no retry on 4xx, one retry otherwise
    ToastProvider        useToast()
      BrowserRouter
        AuthProvider     useAuth()
          App            Routes
```

`AuthProvider` sits inside `QueryClientProvider` and `ToastProvider` because it clears the query cache and shows toasts.

## Routes

Defined in `src/App.tsx`. All protected routes render inside `Layout`. API paths below are relative to `/api/v1`.

| Path | Access | Page | API calls |
| --- | --- | --- | --- |
| `/login` | Public | `LoginPage` | `POST /auth/login` |
| `/` | Public | `HomeRedirect` | None; redirects by role or to `/login` |
| `/author` | Author | `HomeRedirect` | None; redirects to the dashboard |
| `/author/dashboard` | Author | `AuthorDashboardPage` | `GET /books`, `GET /tickets` |
| `/author/books` | Author | `MyBooksPage` | `GET /books` |
| `/author/tickets` | Author | `MyTicketsPage` | `GET /tickets` |
| `/author/tickets/new` | Author | `NewTicketPage` | `GET /books`, `POST /tickets` |
| `/author/tickets/:ticketId` | Author | `AuthorTicketDetailPage` | `GET /tickets/:ticketId`, `POST /tickets/:ticketId/replies`, `GET /notifications`, `POST /notifications/read` |
| `/admin` | Admin | `HomeRedirect` | None; redirects to the queue |
| `/admin/tickets` | Admin | `TicketQueuePage` | `GET /tickets`, `GET /admin/stats`, `GET /admin/users` |
| `/admin/tickets/:ticketId` | Admin | `AdminTicketDetailPage` | `GET /tickets/:ticketId`, `PATCH /tickets/:ticketId`, `POST /tickets/:ticketId/responses`, `POST /tickets/:ticketId/notes`, `POST /tickets/:ticketId/ai-draft`, `GET /books`, `GET /books/:bookId`, `GET /admin/users` |
| `/admin/authors` | Admin | `AuthorsPage` | `GET /admin/authors` |
| `/admin/authors/:authorId` | Admin | `AuthorDetailPage` | `GET /admin/authors/:authorId`, `GET /tickets?authorId=` |
| `*` | Public | `NotFoundPage` | None |

`Layout` also polls `GET /notifications` on every author page.

## Authentication

Files are in `src/auth/`.

| File | Exports | Role |
| --- | --- | --- |
| `AuthContext.ts` | `AuthContext`, `useAuth()` | Exposes `{ status, user, login, logout }`. `status` is `loading`, `authenticated` or `anonymous` |
| `AuthProvider.tsx` | `AuthProvider` | Owns the session state |
| `RequireRole.tsx` | `RequireRole`, `HomeRedirect` | Route guards |
| `homePath.ts` | `homePathFor(role)` | `/admin/tickets` for admins, `/author/dashboard` for authors |
| `tokenStorage.ts` | `tokenStorage` | Reads and writes the JWT in `sessionStorage` under `bookleaf.token`, so each tab has its own login |

**Session behaviour:**

- **On load:** a stored token is checked with `GET /auth/me`. Any failure ends the session, including a backend outage, so the user may have to sign in again after one.
- **Login:** calls the API, then rejects the account if its role doesn't match the role picked on the form. No token is stored in that case.
- **Expired session:** any 401 on an authenticated request clears the token and query cache, and shows one "session expired" toast, even if several polls fail together.
- **Login and logout:** both clear the query cache, so one user never sees another's data.
- **Tabs:** each tab has its own session, so author and admin tabs can run side by side. Signing out of one leaves the others alone, and a new tab asks you to sign in.

**Route guard (`RequireRole`, prop `role`):**

| State | Result |
| --- | --- |
| Session still loading | Full-page spinner |
| Signed out | Redirects to `/login` and remembers the requested path |
| Signed in with the wrong role | Redirects to that role's home |
| Signed in with the right role | Renders the child routes |

## API layer

Files are in `src/api/`.

| File | Exports | Endpoints |
| --- | --- | --- |
| `client.ts` | `apiRequest`, `ApiError`, `isApiError`, `errorMessage`, `setUnauthenticatedHandler` | Shared request logic |
| `types.ts` | Enums and types | TypeScript mirror of the API contract |
| `auth.ts` | `authApi` | `login`, `me` |
| `books.ts` | `booksApi` | `list`, `get` |
| `tickets.ts` | `ticketsApi` | Author: `listMine`, `getMine`, `create`, `reply`. Admin: `listAll`, `getAdmin`, `update`, `respond`, `addNote`, `aiDraft`, `reviseAiDraft` |
| `notifications.ts` | `notificationsApi` | `list`, `markRead` |
| `admin.ts` | `adminApi` | `users`, `authors`, `author`, `stats` |

**`ApiError`** is the only error type UI code handles. It has `status`, `code`, `message` and `details` (field-level errors). `code` is one of the API's error codes, or one of two client-side codes: `NETWORK_ERROR` (status 0) and `BAD_RESPONSE`.

The base URL comes from `VITE_API_BASE_URL`, defaulting to `/api/v1`.

## Data hooks

Files are in `src/hooks/`. `queryKeys.ts` is the central key factory. Keys are hierarchical, so a write can refresh a whole branch.

### Tickets (`useTickets.ts`)

| Hook | Type | Endpoint | Polling and notes | Used by |
| --- | --- | --- | --- | --- |
| `useMyTickets()` | Query | `GET /tickets?limit=100` | 5s | `MyTicketsPage`, `AuthorDashboardPage` |
| `useMyTicket(ticketId)` | Query | `GET /tickets/:ticketId` | 5s; stops after an error | `AuthorTicketDetailPage` |
| `useCreateTicket()` | Mutation | `POST /tickets` | Seeds the detail cache, refreshes lists | `NewTicketPage` |
| `useSendAuthorReply(ticketId)` | Mutation | `POST /tickets/:ticketId/replies` | Seeds the detail cache, refreshes the ticket, lists and stats | `TicketReplyForm` |
| `useAdminTickets(filters)` | Query | `GET /tickets` | 10s; keeps the previous page on screen | `TicketQueuePage`, `AuthorDetailPage` |
| `useAdminTicket(ticketId)` | Query | `GET /tickets/:ticketId` | 10s; stops after an error | `AdminTicketDetailPage` |
| `useUpdateTicket(ticketId)` | Mutation | `PATCH /tickets/:ticketId` | Optimistic, with rollback on error | `ManagementPanel` |
| `useSendResponse(ticketId)` | Mutation | `POST /tickets/:ticketId/responses` | Refreshes the ticket, lists and stats | `useReplyComposer` |
| `useAddNote(ticketId)` | Mutation | `POST /tickets/:ticketId/notes` | Refreshes the ticket, lists and stats | `InternalNoteForm` |
| `useAiDraft(ticketId, enabled, initial)` | Query | `POST /tickets/:ticketId/ai-draft` | No retry and never stale. A draft already on the ticket skips the request | `useReplyComposer` |
| `useRegenerateAiDraft(ticketId)` | Mutation | `POST .../ai-draft` with `regenerate` | Updates the draft cache | `useReplyComposer` |
| `useReviseAiDraft(ticketId)` | Mutation | `POST .../ai-draft` with `revision` | Updates the draft cache | `useReplyComposer` |

The same file exports `retryUnlessClientError`, a retry rule that never retries a 4xx.

### Books (`useBooks.ts`)

| Hook | Endpoint | Used by |
| --- | --- | --- |
| `useBooks(authorId?)` | `GET /books` | `MyBooksPage`, `AuthorDashboardPage`, `NewTicketPage`, `RequesterContext` |
| `useBook(bookId)` | `GET /books/:bookId` | `RequesterContext` |

### Notifications (`useNotifications.ts`)

| Hook | Role | Used by |
| --- | --- | --- |
| `useNotifications(enabled?)` | Polls `GET /notifications` every 5s | The hooks below |
| `useMarkNotificationsRead()` | `POST /notifications/read` | `useMarkTicketNotificationsRead` |
| `useMarkTicketNotificationsRead(ticketId)` | Marks a ticket's notifications read while it is on screen, including new arrivals | `AuthorTicketDetailPage` |
| `useNotificationToasts(enabled)` | Toasts notifications that arrive this session, except for the ticket on screen | `Layout` |

### Admin (`useAdmin.ts`)

| Hook | Endpoint | Notes | Used by |
| --- | --- | --- | --- |
| `useAdminUsers()` | `GET /admin/users` | Cached for 5 minutes | `QueueFilters`, `ManagementPanel` |
| `useAdminStats()` | `GET /admin/stats` | Polls every 10s | `StatsStrip` |
| `useAdminAuthors(params)` | `GET /admin/authors` | Keeps the previous page on screen | `AuthorsPage` |
| `useAdminAuthor(authorId)` | `GET /admin/authors/:authorId` | No retry on 4xx | `AuthorDetailPage` |

Polling pauses in background tabs and catches up when the tab regains focus.

## UI primitives (`src/components/ui`)

Generic building blocks with no knowledge of BookLeaf data.

### `Button` (`Button.tsx`)

A button with variants and a loading state. It also accepts all native button attributes and forwards its ref. `type` defaults to `button`.

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `variant` | `primary`, `secondary`, `ghost`, `danger` | `primary` | Visual style |
| `size` | `sm`, `md` | `md` | Height and padding |
| `loading` | boolean | `false` | Shows a spinner and disables the button |

### `Badge` (`Badge.tsx`)

A small coloured label. Also exports the `BadgeTone` type.

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `tone` | `neutral`, `blue`, `green`, `amber`, `orange`, `red`, `purple`, `yellow` | `neutral` | Colour |
| `icon` | ReactNode | | Leading icon |
| `title` | string | | Tooltip |
| `className` | string | | Extra classes |
| `children` | ReactNode | Required | Label |

### `Card` and `CardHeader` (`Card.tsx`)

`Card` is the bordered container (`className`, `children`). `CardHeader` is its title row.

| `CardHeader` prop | Type | Purpose |
| --- | --- | --- |
| `title` | ReactNode | Required heading |
| `action` | ReactNode | Right-aligned content |
| `className` | string | Extra classes |

### Form controls (`Field.tsx`)

| Component | Props | Role |
| --- | --- | --- |
| `Field` | `label`, `htmlFor`, `error`, `hint`, `aside`, `className`, `children` | Wraps a control with its label and message. The error gets the id `{htmlFor}-error`, for `aria-describedby`. `aside` holds extras such as a counter |
| `Input` | `invalid`, plus native input attributes | Text input with a ref |
| `Textarea` | `invalid`, plus native textarea attributes | Multi-line input with a ref |
| `Select` | `invalid`, plus native select attributes | Dropdown with a ref |
| `CharCount` | `value`, `max`, `min` | "123 / 5,000" counter. Turns amber above 90% of `max` or below `min`, and red above `max` |

### Loading indicators

| Component | File | Props | Role |
| --- | --- | --- | --- |
| `Skeleton` | `Skeleton.tsx` | `className` | One pulsing placeholder |
| `SkeletonList` | `Skeleton.tsx` | `rows` (default 4), `className` | A stack of placeholder rows |
| `Spinner` | `Spinner.tsx` | `className` | Inline spinning icon |
| `FullPageSpinner` | `Spinner.tsx` | `label` (default "Loading…") | Centred page-level spinner |

## Shared components (`src/components`)

### App frame

| Component | Props | Role |
| --- | --- | --- |
| `Layout` | None | The signed-in frame: sidebar navigation by role, user card with sign-out, a mobile drawer that closes on navigation or Escape, and the `Outlet` for the page. For authors it also runs `useNotificationToasts`. Its internal `Brand` component renders the logo and name, with an "Ops" tag for admins |
| `PageHeader` | `title`, `description`, `actions` | Page heading with optional right-aligned actions |
| `Pagination` | `page`, `limit`, `total`, `onPageChange` | "Showing 1–20 of 57" footer with Previous and Next |

### Page states

| Component | Props | Role |
| --- | --- | --- |
| `EmptyState` | `title`, `description`, `icon`, `action` | Shown when there is nothing to display, with a next step |
| `ErrorState` | `error`, `title`, `onRetry`, `retrying` | Shows the error message and a "Try again" button |

### Ticket and book display

| Component | Props | Role |
| --- | --- | --- |
| `StatusPill` | `status` | Ticket status: Open blue, In Progress purple, Resolved green, Closed grey |
| `PriorityBadge` | `priority` | Priority with a colour and an icon, so it doesn't rely on colour alone |
| `AgeIndicator` | `since`, `unresolved` | Relative age. For unresolved tickets it turns amber after 48 hours and red after 5 days |
| `ClassifyingLabel` | None | "Classifying…" with a spinner, shown while `aiStatus` is `pending` |
| `ClassificationHint` | `aiStatus` | Shows where the values came from: "AI" or "rules fallback" |
| `AttachmentList` | `attachments` | Attachment names and sizes. Renders nothing if there are none |
| `BookStatusBadge` | `book` (`status`, `isInProduction`) | "In production · Cover Design" in amber, or the status in green if it contains "live" |

`ClassifyingLabel` and `ClassificationHint` are both in `ClassificationState.tsx`.

### Toasts (`src/components/toast`)

| File | Exports | Role |
| --- | --- | --- |
| `ToastProvider.tsx` | `ToastProvider` | Renders toasts. Keeps at most 4 on screen and dismisses each after 4.5 seconds |
| `useToast.ts` | `useToast()` | Returns `{ success, error, info }`, each taking a message |
| `ToastContext.ts` | `ToastContext`, `ToastApi`, `ToastTone` | Context and types |

## Login and not-found pages

### `LoginPage` (`features/auth/LoginPage.tsx`)

The sign-in form, with a role picker (Author or Admin), email and password. It has no props.

- Admin sign-ins must use an `@bookleaf.com` email, which is checked in the form and again by the API.
- After sign-in, it returns to the page the user originally wanted, but only if that path is in their role's area. Otherwise it goes to their home page.
- Already signed-in users are redirected straight away.
- Demo account buttons fill the form with seeded logins. See [Known gaps](#known-gaps).

### `NotFoundPage` (`features/NotFoundPage.tsx`)

The catch-all page, with a link home. It has no props.

## Author portal

Files are in `src/features/author/`.

### Dashboard: `AuthorDashboardPage`

`dashboard/AuthorDashboardPage.tsx`. The author's home page, with a summary and shortcuts. It has no props, and uses `useBooks`, `useMyTickets` and `useAuth`.

| Internal component | Role |
| --- | --- |
| `SummaryTiles`, `StatTile` | Titles, royalty earned, pending payout, and open queries with the new-reply count. Tiles load independently |
| `BooksPanel` | The first 4 books with status and copies sold |
| `QueriesPanel` | The first 4 tickets, with unread replies first and then the most recently updated |
| `Panel`, `PanelSkeleton`, `PanelError`, `PanelEmpty` | The panel frame and its states. One panel can fail without affecting the other |

### Books

| Component | File | Props | Role |
| --- | --- | --- | --- |
| `MyBooksPage` | `books/MyBooksPage.tsx` | None | All of the author's books with a royalty summary |
| `RoyaltySummary` | `books/RoyaltySummary.tsx` | `books`, `audience` (default `author`) | Four tiles: earned, paid, pending and titles |
| `BookCard` | `books/BookCard.tsx` | `book`, `audience` (default `author`) | One book's details, royalties, platforms and print partner |

`audience` adjusts the wording. `audience="author"` also adds a "Raise a query" link to `BookCard`. The admin portal reuses both components with `audience="admin"`.

`BookCard` handles books that aren't published yet. It shows "Not yet published", em dashes instead of ₹0 or `null`, and an explanation of when royalties start. Finished books show "All paid up" or "No payouts yet" as appropriate.

Internal components: `BooksSkeleton` in `MyBooksPage`, and `Stat`, `Muted` and `PendingRoyalty` in `BookCard`.

### Tickets

**`MyTicketsPage`** (`tickets/MyTicketsPage.tsx`, no props) lists the author's queries.

- The All, Open and Resolved tabs filter in the browser, because the author endpoint has no status filter. "Open" includes In Progress, and "Resolved" includes Closed.
- The current tab is kept in the URL as `?status=`, so Back restores it.
- Internal components: `TicketRow` and `StatusFilterTabs`.

**`NewTicketPage`** (`tickets/NewTicketPage.tsx`, no props) is the form for raising a query.

- Fields: type of query (defaults to "General / Account Level", then the author's books), subject (3-150 characters), description (10-5000 characters) and attachments.
- Uses react-hook-form with zod, with limits that match the API.
- Server validation errors are mapped back onto the matching fields.
- On success, it opens the new ticket with `{ justCreated: true }` in the navigation state.
- It sends the chosen `bookId`, or `null` for a general query. If the books fail to load, the query can still be submitted as general.
- Past the ticket limit (5 an hour by default), the API's message appears at the top of the form and the text is kept.

**`AttachmentPicker`** (`tickets/AttachmentPicker.tsx`) selects files for a new query.

| Prop | Type | Purpose |
| --- | --- | --- |
| `files` | `File[]` | Selected files |
| `onChange` | `(files: File[]) => void` | Called when the selection changes |
| `disabled` | boolean | Disables the control |

It allows up to 5 files of 10 MB each and rejects duplicates, with a message for each rejected file. Only each file's name and size are sent to the API. The files themselves are never uploaded.

**`AuthorTicketDetailPage`** (`tickets/AuthorTicketDetailPage.tsx`, no props) shows one ticket's conversation.

- Polls every 5 seconds, and shows a not-found state for a 404.
- Viewing the ticket clears its "New reply" badge and marks its notifications as read.
- Internal components: `YourMessage`, `StatusBanner` and `DetailSkeleton`.

**`TicketReplyForm`** (`tickets/TicketReplyForm.tsx`) is the author's follow-up box. Props: `ticketId`, `status`.

- The page renders it only after support has replied at least once.
- It disappears once the ticket is Resolved or Closed. If polling picks up that change while the author is typing, the text stays on screen as read-only so it can be copied.
- A 409 from the API is treated the same way.
- Ctrl/⌘ + Enter sends the reply.

**`TicketSubmittedCard`** (`tickets/TicketSubmittedCard.tsx`) is the confirmation with an animated tick, shown once after submitting. Its prop is `ticketNumber`. It scrolls to the top and takes focus, so screen readers announce it. Its animation, in the internal `AnimatedTick` component, runs only when the user allows motion.

## Admin portal

Files are in `src/features/admin/`.

### Ticket queue

**`TicketQueuePage`** (`queue/TicketQueuePage.tsx`, no props) is the admin's home page. It combines `StatsStrip`, `QueueFilters`, the ticket list and `Pagination`, and refreshes every 10 seconds. Changing a filter keeps the old rows on screen, dimmed, until the new ones load.

**`useQueueFilters`** (`queue/useQueueFilters.ts`) keeps the filters in the URL, so a filtered view survives a reload, can be shared, and is restored by Back.

| Returns | Purpose |
| --- | --- |
| `state` | Filters as they appear in the URL (`status`, `category`, `priority`, `assignedTo`, `from`, `to`, `q`, `sort`, `page`) |
| `apiFilters` | The same filters converted for the API. Dates become whole local days |
| `update(patch)` | Changes filters. Any change other than `page` returns to page 1 |
| `reset()` | Clears all filters |
| `activeCount` | How many filters are on, not counting `sort` and `page` |

**`StatsStrip`** (`queue/StatsStrip.tsx`) shows clickable counters. Props: `state`, `onFilter`.

| Tile | Clicking it applies |
| --- | --- |
| Open | `status=Open` |
| In progress | `status=In Progress` |
| Critical | `priority=Critical` |
| Unassigned | `assignedTo=unassigned` |
| Oldest open | `sort=oldest` |

Clicking an active tile removes its filter. If the stats fail to load, a short message appears and the queue keeps working.

**`QueueFilters`** (`queue/QueueFilters.tsx`) holds the filter controls. Props: `state`, `resultCount`, `onChange`, `onReset`.

- Controls: search (debounced by 350 ms), sort, status and priority pills, category, assignee and created-date range.
- Removable chips show the active filters, with the result count and "Clear all".
- Internal components: `PillGroup`, `FilterChip` and `FilterLabel`.

**`QueueHeader` and `QueueRow`** (`queue/QueueList.tsx`) are the table header and one ticket row. `QueueRow` takes `ticket`, and `QueueHeader` has no props. `AuthorDetailPage` reuses both.

- The row shows "Classifying…" while classification is pending, and a "Needs reply" badge when a follow-up is waiting.
- Unresolved Critical tickets get a red border and tint, and finished tickets are dimmed.
- Each row stores the current URL in the link state, so "Back to queue" restores the filters.
- Below the `xl` breakpoint, rows stack as cards.

### Ticket workspace

**`AdminTicketDetailPage`** (`ticket/AdminTicketDetailPage.tsx`, no props) is where admins work on one ticket, and it refreshes every 10 seconds.

```
AdminTicketDetailPage
  Main column
    TicketHeading        Number, status, priority, category, overdue flag, age
    RequesterContext     Author and book facts
    TicketTimeline       Original query, replies, follow-ups and notes
    ReplyComposer        Reply box and AI draft controls
  Sidebar
    ManagementPanel      Status, assignee, category, priority, timings
    InternalNoteForm     Add an internal note
```

`ReplyComposer` and `ManagementPanel` are keyed by ticket id, so unsent text and unsaved edits never carry over to another ticket. Their text lives in local state, so polling can't overwrite it.

The "Back" link returns to where the admin came from: the filtered queue or an author's page.

**`RequesterContext`** (`ticket/RequesterContext.tsx`) shows who is asking and about what. Its prop is `ticket`. It contains two internal components:

- `AuthorCard`: contact details, book count, royalties paid and pending, and a profile link.
- `BookCard`: the linked book's facts, or a note that the query isn't about a specific book.

This internal `BookCard` is separate from `features/author/books/BookCard.tsx`, despite the shared name. It uses the helpers `BookFacts` and `Fact`.

**`TicketTimeline`** (`ticket/TicketTimeline.tsx`) merges the conversation and notes in time order. Its prop is `ticket`. The original query comes first, and the entries are visually distinct:

| Entry | Label |
| --- | --- |
| Original query | "Original query" |
| Author follow-up | "Follow-up" |
| Support reply | "AI-assisted" if it started from a draft |
| Internal note | "Internal" |

Internal components: `Entry`, `AuthorName` and `Timestamp`.

**`ReplyComposer` and `useReplyComposer`** (`ticket/ReplyComposer.tsx`, `ticket/useReplyComposer.ts`) handle the reply box and AI drafts. The component takes `ticket`. The hook holds the logic, and the component renders it.

How drafts behave:

| Situation | Behaviour |
| --- | --- |
| Unresolved ticket opened | A draft is requested automatically |
| Resolved or Closed ticket | No automatic request. A "Generate draft" button is shown, and a cached draft is offered rather than inserted |
| Draft arrives and the box is empty | The draft is inserted automatically |
| Draft arrives and the admin has typed | The text is kept, and "Use AI draft" is offered |
| Author sends a follow-up | The old draft is stale, so a new one is requested. Text the admin edited is kept |
| "Regenerate" | Asks for confirmation first if it would replace the admin's own text |
| "Suggest changes" | The AI rewrites the current text using the admin's suggestions. If that fails, the text stays as it was |
| AI unavailable | A notice appears, and the box stays fully usable. AI never blocks a reply |
| Template draft (`fallback: true`) | A notice says the AI didn't write it |

Safeguards when sending:

- Every send goes through an inline confirmation. Ctrl/⌘ + Enter opens it, and Escape cancels.
- Backend `warnings` appear under "Check before sending".
- Unfilled `[confirm: ...]` placeholders are listed, and the button changes to "Send anyway".
- `usedAiDraft` stays `true` even after edits, until the text is cleared or discarded.
- "Send & mark Resolved" sends the reply and resolves the ticket together.

Internal components: `DraftNoticeBar`, `DraftWarnings` and `SuggestChangesPanel`.

**`ManagementPanel`** (`ticket/ManagementPanel.tsx`) changes the ticket's status, assignee, category and priority. Its prop is `ticket`.

- Edits stay local until "Save changes", and only changed fields are sent.
- Saving is optimistic: values show immediately and roll back on failure, leaving the edits in place to retry.
- Also shows the AI reasoning, and the created, last-activity and resolved times, using the internal `TimingRow` component.

**`ClassificationControl`** (`ticket/ClassificationControl.tsx`) is the category or priority dropdown. It keeps the AI's suggestion visible beside the effective value.

| Prop | Type | Purpose |
| --- | --- | --- |
| `id`, `label` | string | Control id and label |
| `value` | T | Effective value |
| `options` | T[] | Choices |
| `aiValue` | T or null | What classification suggested |
| `aiStatus` | AiStatus | Controls "Classifying…", "AI suggested" or "Rules suggested" |
| `aiConfidence` | number or null | Shown as a percentage for AI results |
| `overridden` | boolean | Shows the "Overridden" badge if the value also differs from the AI's |
| `disabled` | boolean | Disables the control |
| `onChange` | `(value: T) => void` | Called with the new value |
| `onReset` | `() => void` | "Reset to AI", which is saved as `null` |

**`InternalNoteForm`** (`ticket/InternalNoteForm.tsx`) adds a team-only note of up to 2000 characters. Its prop is `ticketId`.

### Authors

**`AuthorsPage`** (`authors/AuthorsPage.tsx`, no props) lists all authors with book, royalty and ticket totals. The search is debounced, and the search text and page are kept in the URL. Internal components: `AuthorsHeader`, `AuthorRow` and `Metric`.

**`AuthorDetailPage`** (`authors/AuthorDetailPage.tsx`, no props) shows one author's full picture: contact details, royalty summary, every book and their tickets. It reuses `RoyaltySummary` and `BookCard` with `audience="admin"`, as well as `QueueHeader` and `QueueRow`. The ticket list has its own pagination, which isn't kept in the URL. Internal components: `ProfileCard`, `ProfileItem`, `Missing`, `SectionTitle`, `Publications` and `AuthorTickets`.

## Helpers (`src/lib`)

| File | Exports | Role |
| --- | --- | --- |
| `format.ts` | `formatINR`, `formatNumber`, `formatDate`, `formatDateTime`, `formatRelative`, `formatAge`, `formatFileSize`, `formatConfidence`, `hoursSince`, `pluralize`, `EMPTY` | Display formatting. Missing or invalid values render as "—", never `NaN` or `null` |
| `books.ts` | `productionStage`, `royaltyTotals` | Gets the stage from "In Production - Cover Design", and totals royalties across books |
| `tickets.ts` | `isUnresolved`, `supportReplyCount` | Ticket checks. Use `supportReplyCount` for team replies, because `responses` also holds author follow-ups |
| `dates.ts` | `startOfLocalDayISO`, `endOfLocalDayISO` | Converts date inputs to whole local days for API filters |
| `seenReplies.ts` | `getSeenCount`, `markResponsesSeen`, `hasUnseenReplies` | "New reply" tracking, stored per browser in `localStorage` under `bookleaf.seenResponses` |
| `constants.ts` | See below | Shared limits and intervals |
| `cn.ts` | `cn` | Joins class names, skipping falsy values |

| Constant | Value | Purpose |
| --- | --- | --- |
| `POLL_AUTHOR_MS` | 5000 | Author polling interval |
| `POLL_ADMIN_MS` | 10000 | Admin polling interval |
| `MAX_ATTACHMENTS` | 5 | Files per query |
| `MAX_ATTACHMENT_BYTES` | 10 MB | Size per file |
| `AGE_WARNING_HOURS` | 48 | Amber age, and the "Overdue" badge |
| `AGE_DANGER_HOURS` | 120 | Red age |
| `ADMIN_PAGE_SIZE` | 20 | Rows per page in admin lists |
| `SEARCH_DEBOUNCE_MS` | 350 | Search delay |

## Patterns to follow

- **Every data view handles three states.** Show a skeleton while loading, `ErrorState` with a retry on failure, and `EmptyState` with a next step when empty. For a detail page, treat a 404 as a not-found `EmptyState`.
- **Use the provided formatters.** Never render a raw number or date, so `null` can't reach the screen.
- **After a write, invalidate rather than patch by hand.** Refresh the detail, the lists and the stats, as `useInvalidateTicket` does.
- **Add query keys to `queryKeys.ts`,** not inline.
- **Keep typed text in local state,** never in the query cache, so polling can't overwrite it.
- **Keep shareable list state in the URL,** as `useQueueFilters` and `AuthorsPage` do.
- **Show field errors on their fields.** Map `ApiError.details` to the matching field, and use a toast or banner for everything else.
- **Keep authors and admins apart.** Author pages use only the `AuthorTicket` type, which has no AI fields or notes.
- **Use accessible markup.** Link errors with `aria-describedby`, announce changes with `role="status"` or `role="alert"`, and hide decorative icons with `aria-hidden`. Never rely on colour alone.

### Adding a page

1. Add any new types to `src/api/types.ts` and a method to the matching API object.
2. Add a query key and a hook in `src/hooks`.
3. Create the page under `src/features/<portal>/`.
4. Add the route inside the right `RequireRole` block in `src/App.tsx`.
5. Add a navigation entry to `authorNav` or `adminNav` in `Layout.tsx`, if it needs one.

## Known gaps

These are places where the code is unfinished or may surprise you.

| Gap | Detail |
| --- | --- |
| Demo logins ship to production | `DEMO_ACCOUNTS` in `LoginPage.tsx` is there so reviewers can switch roles, but it is hard-coded and always shown, and its passwords are in the bundle. Remove it, or hide it in production builds, before real use |
| `BookCard`'s "Raise a query" doesn't preselect the book | The link opens `NewTicketPage` with the type of query dropdown on "General / Account Level", so the author has to choose the book again |
| `queryType` is always `General` | The API still requires `queryType`, so the form sends `General` for every query. Classification and drafts don't use it; `bookId` is what links a query to a book |
| Authors can't follow up before the first reply | `TicketReplyForm` appears only after a support reply, although the API allows a follow-up earlier |
| Stat tiles and filtered rows can disagree | The Critical and Unassigned counts include only unresolved tickets, but their filters also match finished ones, so clicking a tile can show more rows than its number |
| "Oldest open" doesn't filter | It only sorts by oldest, so the top rows can be finished tickets |
| No "Needs reply" filter | The API supports `needsReply`, but the queue only shows a badge |
| `/admin/ai-usage` has no screen | Usage data is available only through the API |
| `updatedSince` isn't used | Lists refetch in full on every poll |
| Author lists stop at 100 | `useMyTickets` requests one page with `limit=100` and filters in the browser, so anything beyond that is missing from the list and its counts |
| "New reply" is per browser | On a new device, every ticket with replies shows as new |
| A backend outage ends the session | A failed `GET /auth/me` on load clears the token, even if the failure wasn't a 401 |
| No frontend tests | Checks so far are type-checking, linting and manual testing |
