# Membership lifecycle (IA-00)

Status: decided 2026-08-26. Answers adopt the recommendations from
`iaeste-tasks.md` revision 2 as-is, since no committee review was available at
decision time. Revisit any single answer deliberately if it turns out wrong —
do not let this document become the project.

## Architecture-changing questions

**1. Does `apps/web` or `apps/inscripcions` need signed-in state?**
No. Both stay public and unauthenticated. This is what keeps the platform to
four deployables instead of five (see "Why there is no auth service" in the
plan) — no cross-subdomain cookies, no credentialed CORS allowlist, no session
proxying in three apps. Revisit only with a concrete user story, not a vague
"might be nice."

**2. Does the committee want an admin review step, or does verified + UdL
email admit automatically?**
Review. A verified UdL email proves the address, not that the person should
be a member. IA-53 (registration review) and most of IA-40's acceptance
transaction exist because of this answer.

**3. Is Google Sheets still wanted once the admin table has filters and CSV
export?**
Keep it, reduced. IA-54 ships as the one-way, no-queue projection described in
the plan. If the committee later says no, IA-54 is deleted outright — nothing
else depends on it.

**4. Does the site need a blog, and will non-developers write posts?**
Yes to both. IA-55 (Keystatic, git-backed CMS mounted in `apps/web`) proceeds
as specified.

**5. Who operates this after the current committee rotates?**
A volunteer organisation replaces its technical people annually. This is the
standing argument for every "smaller" decision in this document — one auth
service instead of two, no CMS as a fifth deployable, no Redis, no org
plugin. Every service, secret, and manual step is a handover cost paid by
someone who did not build the system.

## Lifecycle questions

**6. Campaign definition.** Academic year, e.g. `2026-2027`. Membership dates
and inscriptions dates are stored explicitly on `membership_campaign`, and one
campaign can accept registrations while a different campaign is current
(see the plan's precedence rule: `is_current` and `is_registration_open` are
explicit, authoritative flags, never derived from dates at read time).

**7. Who may sign in.** Accepted members only. Email verification alone does
not grant a session — verification only advances a registration to
`pending_review`. Admin routes additionally require the `admin` role on top of
a valid session.

**8. Invitations.** Pre-approval for a campaign. Proving control of the
invited address plus completing the profile creates the membership directly,
with no second review. An invitation grants admin access only if the inviter
explicitly selected it and had permission to grant it.

**9. Kick and leave.** Both end only the *current campaign* membership, never
delete history. `kicked` requires a reason and revokes active sessions;
`left` implies nothing about conduct. Restoring a mistaken kick or leave is an
explicit, audited action — never a silent status flip.

**10. Roles for v1.** `member` and `admin` only. No finer-grained roles until
a real need appears.

**11. Non-UdL invitations.** Public registration requires a `udl.cat` /
`*.udl.cat` address. An admin may invite an external address behind an
explicit confirmation step — this is the only path for a non-UdL member.

**12. Data retention.** Profile and contact details are not purged when a
person graduates or their membership lapses — `member_profile` and past
`registration`/`membership` rows persist indefinitely as history, since IA-51
explicitly rules out hard delete in v1. A person can request removal; that is
a manual, logged operation performed by an admin against GDPR obligations
(export before delete), not an automated retention job. Revisit this once a
real request happens or before any EU-facing legal review — this default
optimises for "don't build a deletion pipeline before anyone asks for one,"
not for a settled compliance position.

**13. Production hostnames.** `www.iaestelleida.cat`, `inscripcions.iaestelleida.cat`,
`admin.iaestelleida.cat`, `api.iaestelleida.cat`, per the plan's target shape.
IAESTE Lleida is assumed to control all four; confirm DNS access before IA-62.

## IA-07 — email deliverability

Not yet proven. Sending a real magic-link-shaped message to a `@alumnes.udl.cat`
address and confirming inbox placement (not just a 200 from the API) requires
a verified Resend sending domain (SPF/DKIM/DMARC) and a real UdL mailbox to
check — neither is available to an automated agent. This is a manual step for
whoever holds the Resend account:

1. Verify `iaestelleida.cat` as a sending domain in Resend (SPF, DKIM, DMARC).
2. Send a realistic magic-link-shaped email to a real `@alumnes.udl.cat`
   address.
3. Confirm it lands in the inbox, not spam, and record the outcome here.

**Outcome:** _pending — record the result here once someone with Resend
access runs the steps above. If links are filtered, raise it before IA-30
(authentication) is implemented, since the whole login flow depends on this._

## Acceptance criteria (from IA-00)

- Every state and transition above has one name and one owner: satisfied by
  the "Rules" and "Tables" sections of `iaeste-tasks.md`, which this document
  does not restate.
- Renew, invite, approve, reject, leave, kick, restore, and role change are
  each answered above.
- Email copy can be derived from this lifecycle without inventing new states.
