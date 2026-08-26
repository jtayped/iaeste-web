-- IA-11: "no transition out of accepted" for `registration.status`.
--
-- A plain CHECK constraint cannot see the row's previous value, so this is a
-- BEFORE UPDATE trigger instead. Drizzle's schema DSL has no way to express
-- a trigger, so this is a hand-written custom migration (via
-- `drizzle-kit generate --custom`) rather than something generated from
-- src/schema — see the comment on `registrationStatusEnum` in
-- src/schema/registration.ts.
CREATE FUNCTION registration_forbid_leaving_accepted() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'accepted' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'registration % is accepted and cannot change status (attempted: %)', OLD.id, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER registration_forbid_leaving_accepted
  BEFORE UPDATE ON "registration"
  FOR EACH ROW
  EXECUTE FUNCTION registration_forbid_leaving_accepted();
