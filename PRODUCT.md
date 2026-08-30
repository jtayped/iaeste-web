# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary audiences are Universitat de Lleida students seeking paid technical internships abroad and companies in Lleida that can host international technical students. Incoming interns and students who want to join the local committee are supporting audiences.

## Product Purpose

IAESTE LC Lleida connects UdL students, local employers, and the international IAESTE exchange network. The product explains the programme, helps students and companies contact the local committee, supports incoming interns, and collects applications from prospective committee members.

Success means that each audience understands its next step, trusts the claims on the site, and can complete that step without needing prior knowledge of IAESTE.

## Positioning

IAESTE LC Lleida is the local, student-run connection between the UdL community and IAESTE's international technical-internship network. Its reciprocal exchange model links local placements for incoming students with opportunities for UdL students abroad. The local committee also coordinates with IAESTE Spain and helps participants with the programme's paperwork and arrival logistics.

## Operating Context

- The public site explains IAESTE to students, companies, and incoming interns, then routes them to contact or registration.
- The registration app collects a prospective member's identity, contact details, degree, year of study, previous membership, and an optional note.
- The registration app submits to a separately deployable HTTP API.
- The public site supports Catalan, Spanish, and English. Catalan is the default locale.
- IAESTE LC Lleida works within the Escola Politècnica Superior and the wider Universitat de Lleida community.

## Capabilities and Constraints

- The repository is an npm and Turborepo monorepo. Its web interfaces use Next.js 15, React 19, Tailwind CSS, and a shared UI package. The API is a Hono application.
- The root product record governs the public site, registration flow, API, and shared packages. Add an app-specific product file only when an app gains durable product rules that conflict with or materially extend this record.
- Public claims must state whether a figure refers to IAESTE worldwide, IAESTE Spain, or IAESTE LC Lleida, and must include a date when the figure can change.
- Do not publish invented testimonials, student stories, outcomes, partner relationships, or local statistics.
- Migrating existing interface copy to lowercase is confirmed work that remains to be completed.

## Brand Commitments

- The product name is IAESTE LC Lleida and the institutional context includes IAESTE Spain, Universitat de Lleida, and Escola Politècnica Superior.
- All human-readable interface copy uses lowercase. This includes headings, labels, calls to action, acronyms, and displayed product names. Lettering baked into supplied logo assets can retain its original form.
- Preserve the official IAESTE LC Lleida logo. The masters live in `assets/brand/source/`; every derived favicon, app icon and lockup is generated from them by `assets/brand/generate-brand.mjs` into each app's `public/brand/` and rendered through `@repo/ui/logo`. Do not hand-edit a derived file or reintroduce per-app copies.
- Catalan, Spanish, and English versions must communicate the same facts and actions rather than drifting into separate claims.

## Evidence on Hand

- IAESTE International currently reports 100+ countries served, 374,000+ students sent on internships since 1948, 3,000+ host organisations, and 2,500+ volunteers: <https://iaeste.org/countries>.
- IAESTE Spain confirms that its internships are paid, that pay is intended to cover living costs, and that the exchange model depends on obtaining a local placement for an incoming student: <https://iaeste.es/en/faq/>.
- The UdL Escola Politècnica Superior 2023-24 annual report describes IAESTE Lleida as having about 50 UdL student members. It records four outgoing students and no incoming students for that academic year: <https://www.eps.udl.cat/export/sites/Eps/docs/info_eps/memo_activitats_eps/Memoria-dactivitats-Any-2023-24.pdf>.
- The UdL Escola Politècnica Superior 2020-21 annual report confirms that Jonathan Gruss completed an IAESTE placement at Factory Data from 5 July to 29 August 2021. This supports the placement fact, not the testimonial wording in the site copy: <https://www.eps.udl.cat/export/sites/Eps/docs/info_eps/memo_activitats_eps/Memoria-dactivitats-Any-2020-2021.pdf>.
- Existing team photography is under `apps/web/public/team/`. Existing collaborator and company assets are under `apps/web/public/collaborators/` and `apps/web/public/factory-data/`.
- The translated public copy is under `apps/web/messages/`. Several outgoing-student stories read as placeholders and have no source in the repository. Treat them as unverified until IAESTE LC Lleida supplies evidence.
- The current `20 countries` and `40 volunteers` values in `apps/web/src/constants/statistics.ts` were not supported by the sources checked during initialization. Do not reuse them as factual claims without a source and scope.

## Product Principles

1. Make the next step obvious for students, companies, incoming interns, and prospective volunteers.
2. Explain the reciprocal exchange model plainly. It is the mechanism that distinguishes IAESTE from a generic internship board.
3. Prefer modest, sourced claims over generic success stories or inflated global language.
4. Keep facts and actions aligned across Catalan, Spanish, and English.
5. Use lowercase consistently as the product's written signature.
