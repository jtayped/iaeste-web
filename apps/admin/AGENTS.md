# admin

Internal admin app. Next.js 15 (App Router, Turbopack), Catalan-only, port 3005. Same-origin rewrites send `/api/auth/*` and `/api/v1/*` to `apps/api`
(`next.config.ts`); the browser never sees the API origin. Read the root
`AGENTS.md` and `docs/auth.md` first; this file only covers what is specific to
this app.

## Every page goes through `<PageShell>` — no exceptions

A page component's top-level element is always `<PageShell>`. It is the single
place the breadcrumb, the visible page header, and the document title are
rendered, so those never drift between pages. A new route that renders its own
ad-hoc header, or omits the breadcrumb, is a bug — reviewers should reject it.

```tsx
// app/(app)/members/[id]/page.tsx
export default async function MemberDetailPage({ params }: PageProps) {
  const member = await fetchMember(params.id);
  return (
    <PageShell
      breadcrumb={[
        { label: "membres", href: "/members" },
        { label: member.fullName }, // dynamic leaf, no href = current page
      ]}
      title={member.fullName}
      description="perfil, historial d'altes i baixes, i accions."
    >
      {/* page body */}
    </PageShell>
  );
}
```

Rules the shell enforces, and that you must respect when adding a page:

- **Breadcrumb is required and declared as data.** An array of
  `{ label: string; href?: string }`, root-first, _without_ the `panell` root —
  the shell prepends it. The last entry has no `href` and renders as the
  current page. `label` is lowercase Catalan for fixed segments; a dynamic leaf
  (a person's name, a campaign label) is shown as it comes from the data.
  The dashboard passes no `breadcrumb` at all: its whole trail is the root.
- **Dynamic segments** come from the loaded record, so the crumb lives in the
  page (a server component that has already fetched the record), never in a
  path-derived client component. `panell › sol·licituds › Berta Puig` is a
  two-entry `breadcrumb` prop:
  `[{label:"sol·licituds",href:"/registrations"}, {label:"Berta Puig"}]`.
- **Document title changes per page.** `<PageShell>` sets `document.title` from
  a `panell · <trail>` template on the client, and every page _also_ exports
  Next `metadata` (static routes) or `generateMetadata` (dynamic routes) so the
  server response and the tab are right before hydration. Build both from
  `src/lib/page-title.ts` and they cannot drift:
  `export const metadata = adminMetadata(BREADCRUMB, TITLE, DESCRIPTION)`.
  `adminMetadata` derives the trail with the same `pageTrail()` the shell uses
  and emits an **absolute** title, because `adminTitle` already applies the
  `panell ·` prefix that the root layout's `panell · %s` template would
  otherwise apply a second time.
- **The header is the shell's, not yours.** Title, description, and an optional
  `actions` slot (right-aligned on `sm+`, stacked under the title on a phone)
  are props. Do not add a second `<h1>` or a bespoke toolbar above the content.

The full prop shape (`src/components/shell/page-shell.tsx`):

```ts
interface PageShellProps {
  breadcrumb?: readonly BreadcrumbEntry[]; // default [], no `panell` root
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}
```

**The breadcrumb renders at the top of the content column, not in the app
header.** It is page-owned data and the header is rendered by the `(app)`
layout one level up, so putting it there would need a client-side context
bridge that paints empty and pops in on every navigation. The header keeps only
stable chrome: the sidebar toggle, the campaign context, and the notifications
toggle.

`<PageShell>` also owns the content column, exported as `PAGE_CONTAINER_CLASS`
so `(app)/loading.tsx` can use the same one — the skeleton and the page it
becomes must not shift. The `(app)` layout deliberately contributes no padding
or max-width of its own.

The catalogue of fixed routes and their Catalan labels lives in `src/lib/nav.ts`
— the sidebar reads it, and pages should take their fixed crumb labels from the
same wording so a route is never labelled two different ways. The breadcrumb
itself no longer reads it: crumbs are page-declared, because only the page has
the record a dynamic leaf names.

## Mobile first — the layout is designed for a phone and scaled up

This app is used on a phone as often as on a laptop (committee members checking
the review queue between classes). Build every screen mobile-first:

- Start from the single-column, ~360px layout. Add `sm:` / `md:` / `lg:`
  refinements on top; never design desktop-first and cram it down.
- **A table stays a table at every width.** Do not turn rows into stacked
  cards on a phone — a list of records reads as a table, and two different
  shapes for one screen is two layouts to keep in agreement. Narrow viewports
  get a horizontally scrollable table inside its own `overflow-x-auto`
  wrapper (never the page body), and columns that are not worth the sideways
  scroll are hidden with responsive classes. See "Tables" below.
- Touch targets ≥ 44px. Primary actions reachable with a thumb — prefer a
  bottom-anchored action bar or a `Sheet` over a top-right button row on small
  screens.
- Test at 360×640 before calling a page done.

### Navigation on mobile

The sidebar collapses to a `Sheet` (hamburger in the header) on `< md`. That
is built into `@repo/ui/sidebar` — the same `<AppSidebar>` renders itself as a
`Sheet` below the provider's 768px `isMobile` breakpoint, so there is no second
mobile nav to maintain. The hamburger is `<SidebarToggle>`, which replaces the
shared `<SidebarTrigger>` for two reasons: the trigger is a fixed 28px (under
the touch-target floor) and the control means different things at the two sizes
(open a drawer vs. collapse a rail), so it shows a different icon for each. A
bottom tab bar was considered and rejected for now: on iOS Safari a
`position: fixed` bottom bar fights the dynamic address/toolbar chrome (it
jumps when the toolbar shows/hides, and taps near it re-summon the toolbar
instead of hitting the target). If we ship the bottom bar later it must be
gated to the installed PWA (`display-mode: standalone`), where that chrome is
gone, and fall back to the `Sheet` in a browser tab. Until then: header +
`Sheet`.

Tapping a nav row closes the sheet (`setOpenMobile(false)` in `SidebarNav`).
Client navigation swaps the page underneath without unmounting the sidebar, so
without this the drawer sits open on top of the page you just asked for. The
call is a no-op on `md+`, where the sidebar is a persistent rail. Any new row
added to the mobile nav needs the same handler.

## Tables

**Every list screen renders through one component: `<DataTable>`**
(`src/components/data-table/`). Members, sol·licituds, convits and campanyes
all use it, and a new list must too. It owns the header row, the row density,
the loading skeleton, the empty state, the error state and the pager, so a
list cannot look like a different product from the one next to it. A page that
draws its own `<table>`, or its own "no hi ha res" panel, is a bug — reviewers
should reject it.

**All querying is server-side.** Search, filters and pagination are URL search
parameters (`?q=&status=&filter=&page=`), read with `useTableParams`
(`src/lib/table-params.ts`) and passed straight to the API. What renders is
exactly the set the API returned for the parameters currently in the address
bar.

- **Never filter, search, sort or paginate rows already in memory.** A
  `.filter()` over `query.data` to implement a control is the specific bug
  this section exists to prevent. If the API cannot back a filter yet, leave
  the control out and say so — do not fake it on the client.
- Search boxes are debounced (`<TableSearch>`) and then pushed to the URL; the
  URL change is what triggers the request. Typing does not filter anything.
- Changing a filter or the search resets `page` to 1. An offset from the old
  result set is meaningless against a new one.
- `router.replace`, not `push`: paging should not build a history stack that
  the back button has to walk out of.
- A pager is rendered only where the list route actually takes
  `limit`/`offset`. Today that is `GET /v1/admin/members` alone; the
  registrations, invitations and campaigns routes return their whole set, and
  those tables correctly show no pager rather than a client-side imitation.

**Columns are declared once** as `DataTableColumn<Row>[]`, usually at module
scope. `primary: true` marks the one cell that links to the record. Responsive
display classes go in `className`, which is applied to the `<th>` and every
`<td>` together so a header can never drift away from its column.

## PWA

`apps/admin` is installable and receives web-push notifications.

- `public/manifest.webmanifest` plus `icon-192.png`, `icon-512.png`,
  `icon-maskable-512.png`, `apple-touch-icon.png` and `icon.svg` — a navy `IA`
  monogram. `display: "standalone"`, `start_url` and `scope` `/`. The root
  layout wires them through Next's `metadata.manifest` / `metadata.icons` and a
  per-scheme `viewport.themeColor` matched to `--background`.
- One service worker at `public/sw.js`. Plain JS served as a static file, never
  compiled or bundled, so what you read is what the browser runs. It handles
  `push` (show a notification from the JSON payload `{ title, body, url, tag }`)
  and `notificationclick` (focus an open admin tab and navigate it, else
  `openWindow`). It does **no** offline caching: every screen here is live,
  session-gated data and a stale cached shell would be worse than an error.
  `<ServiceWorker>` (mounted in the `(app)` layout) registers it after `load`.
- Push lives in `src/lib/push.ts`, through the generated client, never raw
  `fetch`: `GET /v1/admin/push/public-key` →
  `PushManager.subscribe({ applicationServerKey })` →
  `POST /v1/admin/push/subscribe`. Unsubscribing calls
  `subscription.unsubscribe()` first, then `POST /v1/admin/push/unsubscribe` —
  that order leaves at worst a stale row the API prunes on its next 410, rather
  than a live subscription the user believes they turned off.
- Never hardcode the VAPID key — fetch it. An empty string means push is
  disabled server-side, so `<NotificationsToggle>` renders nothing at all,
  as it does on a browser without `serviceWorker`/`PushManager`/`Notification`.
  A dead control is worse than no control.
- Ask for notification permission from a deliberate user action — the header
  toggle — never on load. A prompt nobody asked for is how a site earns a
  permanent block.

## The blog CMS link

The marketing site's Keystatic CMS is linked from the sidebar's `organització`
group. It is modelled in `src/lib/nav.ts` as an `externalNavItems` entry, kept
out of `navGroups` on purpose: it is not a route of this app, so it must never
match `isActive`, resolve a breadcrumb, or be prefetched by `<Link>` (it renders
as a plain `<a target="_blank" rel="noopener noreferrer">`).

Its href is not in that module either. `WEB_PUBLIC_ORIGIN` is server-only
config, so the `(app)` layout resolves `${env.WEB_PUBLIC_ORIGIN}/keystatic` and
passes it down as `externalHrefs` — the client sidebar never imports
`@repo/env`, and nothing about the marketing origin reaches the browser bundle
beyond the one resolved URL.

## Data fetching

- Server components with `getServerApiClient()` (`src/lib/api.server.ts`) for
  the first paint of a page — it forwards the session cookie.
- TanStack Query (`src/lib/api.ts`, the browser client) for anything that
  mutates or polls: the review queue, the members table, every action button.
- Errors surface as rendered state (`ErrorState`), never a swallowed
  `console.error` — same rule as the rest of the repo.

## Before you finish

From the repo root: `npm run lint && npm run check-types && npm run test`.
All three gate CI. `eslint . --max-warnings 0` here means a `max-lines` warning
(300) fails the build — split components the way `@repo/ui` splits `sidebar`.
