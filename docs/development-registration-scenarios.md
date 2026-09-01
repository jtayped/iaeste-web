# Registration scenarios in development

Reset and seed the development database before testing the registration flow:

```sh
npm run db:reset
npm run db:seed
npm run dev
```

In development, the API does not send registration codes through Resend. It
prints each code in its terminal instead:

```text
[registration OTP] returning.same@alumnes.udl.cat: 418502
```

Use these addresses in `/formulari`:

| Email                              | Expected path                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `new.student@alumnes.udl.cat`      | New applicant with a university address and blank details.                                  |
| `new.personal@example.com`         | New applicant with a personal address and blank details.                                    |
| `returning.same@alumnes.udl.cat`   | Profile found from last year. Submission renews the membership automatically.               |
| `returning.alias@alumnes.udl.cat`  | Same returning member found through the linked university address.                          |
| `returning.alias@example.com`      | Same returning member found through the linked personal address.                            |
| `forgotten.new@example.com`        | No match. Answering "yes" on the member question shows the wrong-email warning.             |
| `forgotten.old@alumnes.udl.cat`    | Retry for the previous case. The old address finds the profile and can renew automatically. |
| `older.member@alumnes.udl.cat`     | Older membership is found, but it is not from last year, so submission waits for review.    |
| `left.lastyear@example.com`        | Last year's ended membership and profile are found. Submission waits for review.            |
| `kicked.lastyear@alumnes.udl.cat`  | Last year's ended membership and profile are found. Submission waits for review.            |
| `pending.current@example.com`      | A pending application already exists in the open campaign.                                  |
| `accepted.current@alumnes.udl.cat` | The address is already accepted in the open campaign.                                       |
| `rejected.current@example.com`     | The address already has a rejected application in the open campaign.                        |

The seed also opens the `2026-2027` registration campaign. Running `db:seed`
twice without `db:reset` will fail on unique rows by design.
