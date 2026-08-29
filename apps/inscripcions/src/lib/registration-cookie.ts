import Cookies from "js-cookie";

import { readRegistrationId } from "./registration-flow";

const COOKIE_NAME = "registration_id";

/**
 * The id of the registration last created from this browser.
 *
 * This is a convenience only: it lets us offer a "resend the email" shortcut
 * to someone who comes back later, and warn before they fill the form twice.
 * It is never the thing that decides whether a registration is allowed — the
 * API's `ALREADY_REGISTERED` response is the only real signal, and this cookie
 * must never block or redirect anyone on its own.
 *
 * An opaque database id, not an email or a token, so it carries no PII.
 */
export function rememberRegistrationId(id: string): void {
  Cookies.set(COOKIE_NAME, id, {
    expires: 90,
    sameSite: "strict",
    secure: window.location.protocol === "https:",
  });
}

export function recallRegistrationId(): string | undefined {
  return readRegistrationId(Cookies.get(COOKIE_NAME));
}
