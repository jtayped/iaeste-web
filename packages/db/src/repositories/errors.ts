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
