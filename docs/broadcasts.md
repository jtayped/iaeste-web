# Broadcasts and bulk review

How the committee reaches a group of people, and how a room of applicants
becomes a room of members. Both exist for the same evening: the assembly where
newcomers who filled in the public form are accepted in person.

## The composer is a table action, not a page

Every selectable admin list — sol·licituds, membres, invitacions — offers the
same "send an email" action from the same selection bar, backed by the same
four routes. There is deliberately no separate "mailing" screen: the audience
an operator can reason about is the one they just filtered and ticked, so the
composer opens from that table rather than asking them to rebuild the
selection somewhere else.

The wire shape is one discriminated union:

```jsonc
{
  "kind": "registrations",           // or "members" | "invitations"
  "selection": {
    "mode": "all",                   // or "ids", with "rowIds"
    "campaignId": "…",
    "status": "pending_review",
    "excludedRowIds": []
  }
}
```

`selection` mirrors the admin `<DataTable>`'s own `DataTableSelectionValue`
exactly, so "select all, untick three" survives the trip to the server instead
of collapsing to whatever twenty rows were in memory.
`apps/api/src/lib/broadcast-audience.ts` is the only place that translates
those `rowIds` into each table's own key.

## The preview is the email

`POST /v1/admin/broadcasts/preview` renders the same `Broadcast` React Email
component, through the same `render`, that the send path uses — and returns the
HTML. The composer displays those bytes in a sandboxed iframe. A preview that
merely approximates the message is how a mass send goes out with a broken link
nobody saw, so this one does not approximate.

The body is markdown, not HTML: `@react-email/markdown` produces table-based
output that survives Gmail and Outlook, which pasted HTML does not.

## Placeholders

`{{nom}}`, `{{cognoms}}`, `{{correu}}` — and nothing else. The closed set lives
in `@repo/constants/validators/broadcast` and is enforced on both sides, so
`{{name}}` is a validation error in the composer rather than three hundred
emails that literally read "hola {{name}},". Substitution happens before the
markdown is rendered, so a name containing markdown characters cannot smuggle
formatting into the message.

## Guards worth knowing

| Guard                       | Where                                  | Why |
| --------------------------- | -------------------------------------- | --- |
| One message per recipient   | `Emailer.sendBatch`                    | One `to` with everybody in it publishes the whole list to everybody on it. |
| De-duplication by address   | `createBroadcastRecipientRepository`   | One person can hold two rows a selection reaches. |
| `expectedRecipients`        | `POST /v1/admin/broadcasts`            | 409 when the audience changed since the operator confirmed the count. |
| 500-recipient ceiling       | `BROADCAST_MAX_RECIPIENTS`             | More than the whole organisation means a mis-set filter, not a real send. |
| Test send goes to the author | `POST /v1/admin/broadcasts/test`       | The address comes from the session; a caller-supplied one would make this an open relay over our verified domain. |

## Bulk accept

`POST /v1/admin/registrations/bulk-accept` accepts a whole review-queue
selection. Three properties, none of them free:

1. **Each acceptance is its own transaction.** One applicant whose addresses
   collide with an existing account lands in `failed`, named, without rolling
   back the forty-nine memberships around them.
2. **A row that stopped being `pending_review` is skipped, not failed.** Two
   admins working the queue at once is the expected case at an assembly.
3. **Every email goes out after every membership is committed**, in one batch.
   An acceptance that is real in Postgres but unannounced is recoverable; the
   reverse is not. `notificationsFailed` names anyone who must be told by hand.

A `mode: "all"` selection is narrowed to `pending_review` server-side, so
"select all" taken on the `tots` tab accepts exactly the acceptable rows.

## Why the public rate limits are shaped the way they are

The traffic that must not be blocked is bursty — a lecture hall filling in the
form during a presentation, all behind one NAT'd university address. The
traffic worth blocking is sustained. So the per-IP limits run on a five-minute
window sized for the room (`IP_WINDOW_MS` in `apps/api/src/app.ts`) rather than
a tight per-minute ceiling that would reject most of that room.

The limits that actually protect an individual inbox are per-address and live
elsewhere: the sixty-second resend cooldown, the five-sends-a-day ceiling, and
the per-challenge attempt counter behind the code check.

`POST /v1/registrations/start` now answers **502** when the mail provider
refuses the code, and gives the per-address cooldown back so a retry really
sends one. Every other outcome of that route stays deliberately
indistinguishable — whether an address is already registered is a fact about a
person; "we could not send you the code" is a fact about us, and hiding it
leaves someone waiting for an email that is never coming.
