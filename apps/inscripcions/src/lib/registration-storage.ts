const DRAFT_SESSION_KEY = "iaeste-registration-draft-session";
const MEMBERSHIP_STEP_KEY = "iaeste-registration-membership-step";
const PENDING_CODE_KEY = "iaeste-registration-pending-code";

export interface PendingCode {
  email: string;
  resendAvailableAt: number;
}

export function readDraftSession(): string | null {
  return window.sessionStorage.getItem(DRAFT_SESSION_KEY);
}

export function rememberDraftSession(token: string): void {
  window.sessionStorage.setItem(DRAFT_SESSION_KEY, token);
}

export function rememberMembershipStep(token: string): void {
  window.sessionStorage.setItem(MEMBERSHIP_STEP_KEY, token);
}

export function rememberPendingCode(value: PendingCode): void {
  window.sessionStorage.setItem(PENDING_CODE_KEY, JSON.stringify(value));
}

export function readPendingCode(): PendingCode | undefined {
  const raw = window.sessionStorage.getItem(PENDING_CODE_KEY);
  if (!raw) return undefined;

  try {
    const value = JSON.parse(raw) as Partial<PendingCode>;
    if (
      typeof value.email !== "string" ||
      !value.email ||
      typeof value.resendAvailableAt !== "number" ||
      !Number.isFinite(value.resendAvailableAt)
    ) {
      window.sessionStorage.removeItem(PENDING_CODE_KEY);
      return undefined;
    }
    return {
      email: value.email,
      resendAvailableAt: value.resendAvailableAt,
    };
  } catch {
    window.sessionStorage.removeItem(PENDING_CODE_KEY);
    return undefined;
  }
}

export function clearPendingCode(): void {
  window.sessionStorage.removeItem(PENDING_CODE_KEY);
}

export function hasCompletedMembershipStep(token: string): boolean {
  return window.sessionStorage.getItem(MEMBERSHIP_STEP_KEY) === token;
}

export function clearRegistrationSession(): void {
  window.sessionStorage.removeItem(DRAFT_SESSION_KEY);
  window.sessionStorage.removeItem(MEMBERSHIP_STEP_KEY);
  window.sessionStorage.removeItem(PENDING_CODE_KEY);
}
