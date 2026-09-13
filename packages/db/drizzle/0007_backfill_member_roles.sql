-- Repair accounts that were accepted through the public registration path
-- before `acceptRegistrationTx` set a role.
--
-- That path inserts the `user` row directly rather than through Better Auth,
-- so the plugin's `defaultRole: "member"` never applied and the account was
-- left with a null role. `can()` rejects every capability for an unrecognised
-- role — `admin.access` included — so these people could complete a magic-link
-- sign-in and still be redirected straight back out of the dashboard.
--
-- Narrowed to accounts that actually hold a member profile, which is what
-- makes this safe: it only touches people the committee already accepted, and
-- `role IS NULL` means it can never overwrite an existing member or admin.
-- Idempotent, so re-running it is a no-op.
UPDATE "user"
SET "role" = 'member'
WHERE "role" IS NULL
  AND EXISTS (
    SELECT 1 FROM "member_profile"
    WHERE "member_profile"."user_id" = "user"."id"
  );
