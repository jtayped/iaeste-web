/**
 * Thrown by a repository method when the row it looked up is not in a state
 * that allows the requested transition (e.g. accepting an already-rejected
 * registration, or leaving a membership that already ended). Distinct from
 * "not found" and from a raw Postgres constraint violation, so callers can
 * tell "this is a business-rule conflict" apart from "the id was wrong" or
 * "the database rejected this for an unrelated reason".
 */
export class IllegalTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IllegalTransitionError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * An email address an admin tried to attach to a member is already linked to
 * a different account (as a `user_email` alias or a canonical `user.email`).
 * `user_email.email` is globally unique, so this would fail at the database
 * anyway — this is the same rule caught early with a caller-friendly name.
 */
export class EmailAddressInUseError extends Error {
  constructor(public readonly email: string) {
    super(`The address ${email} is already linked to another account.`);
    this.name = "EmailAddressInUseError";
  }
}

/**
 * An edit would leave a member with no email address at all. A member must
 * always keep at least one (university or personal) — the same "at least one,
 * never neither" rule the registration flow enforces.
 */
export class LastEmailRemovalError extends Error {
  constructor() {
    super("A member must keep at least one email address.");
    this.name = "LastEmailRemovalError";
  }
}

/** The same address cannot occupy both labelled slots on one account. */
export class DuplicateEmailSlotsError extends Error {
  constructor() {
    super("The university and personal addresses must differ.");
    this.name = "DuplicateEmailSlotsError";
  }
}

/** The supplied addresses resolve to more than one member account. */
export class EmailIdentityConflictError extends Error {
  constructor() {
    super("The supplied email addresses belong to different users.");
    this.name = "EmailIdentityConflictError";
  }
}
