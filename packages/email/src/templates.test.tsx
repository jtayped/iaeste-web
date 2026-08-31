import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "@react-email/components";
import type { ReactElement } from "react";

import ContactFormEmail from "./emails/contact-form";
import InvitationCancelled from "./emails/invitation-cancelled";
import MembershipAccepted from "./emails/acceptance";
import MembershipRejected from "./emails/rejection";
import RegistrationPending from "./emails/pending-review";
import RegistrationVerificationLink from "./emails/registration-verification-link";
import SignInMagicLink from "./emails/magic-link";
import UserInvitation from "./emails/invitation";
import UserRequest from "./emails/request";
import VerifyUserEmail from "./emails/verify-email";

/**
 * Every template, rendered with the same `PreviewProps` the `email dev`
 * preview server uses. A template that drifts away from its preview data
 * fails here rather than in someone's inbox.
 */
const templates: [string, () => ReactElement][] = [
  [
    "acceptance",
    () => <MembershipAccepted {...MembershipAccepted.PreviewProps} />,
  ],
  [
    "contact-form",
    () => <ContactFormEmail {...ContactFormEmail.PreviewProps} />,
  ],
  [
    "invitation-cancelled",
    () => <InvitationCancelled {...InvitationCancelled.PreviewProps} />,
  ],
  ["invitation", () => <UserInvitation {...UserInvitation.PreviewProps} />],
  ["magic-link", () => <SignInMagicLink {...SignInMagicLink.PreviewProps} />],
  [
    "pending-review",
    () => <RegistrationPending {...RegistrationPending.PreviewProps} />,
  ],
  [
    "rejection",
    () => <MembershipRejected {...MembershipRejected.PreviewProps} />,
  ],
  [
    "registration-verification-link",
    () => (
      <RegistrationVerificationLink
        {...RegistrationVerificationLink.PreviewProps}
      />
    ),
  ],
  ["request", () => <UserRequest {...UserRequest.PreviewProps} />],
  ["verify-email", () => <VerifyUserEmail {...VerifyUserEmail.PreviewProps} />],
];

describe("every template renders", () => {
  for (const [name, template] of templates) {
    it(name, async () => {
      const html = await render(template());

      assert.match(html, /<html/i);
      // The shared wrapper's logo, i.e. the template really went through it.
      assert.match(html, /brand\/icon-navy\.png/);
      assert.doesNotMatch(html, /undefined/);
      // Preview data must stay obviously fake: example.com is reserved for it,
      // a gmail.com or google.com placeholder reads as someone's real address.
      assert.doesNotMatch(html, /gmail\.com|google\.com/);
    });
  }
});

describe("pending-review", () => {
  it("states that verifying the address is not membership", async () => {
    const html = await render(
      <RegistrationPending {...RegistrationPending.PreviewProps} />,
    );

    // Required by docs/membership-lifecycle.md answer 7: verification only
    // advances a registration to pending_review, it grants nothing.
    assert.match(html, /verificar el correu no et fa membre/);
  });
});

describe("acceptance", () => {
  const props = {
    name: "John Doe",
    loginLink: "https://example.com/entrar",
    campaign: "2026-2027",
  } as const;

  it("carries the same first-login link on both paths", async () => {
    const fromRegistration = await render(
      <MembershipAccepted {...props} via="registration" />,
    );
    const fromInvitation = await render(
      <MembershipAccepted {...props} via="invitation" />,
    );

    for (const html of [fromRegistration, fromInvitation]) {
      assert.match(html, /https:\/\/example\.com\/entrar/);
      assert.match(html, /entrar al meu compte/);
    }

    assert.match(fromRegistration, /ha revisat la teva/);
    assert.match(fromInvitation, /has acceptat la/);
  });
});

describe("rejection", () => {
  it("quotes the admin's note when there is one", async () => {
    const html = await render(
      <MembershipRejected
        name="John Doe"
        campaign="2026-2027"
        reason="Lorem ipsum dolor sit amet."
      />,
    );

    assert.match(html, /Lorem ipsum dolor sit amet\./);
  });

  it("renders without a note", async () => {
    const html = await render(
      <MembershipRejected name="John Doe" campaign="2026-2027" />,
    );

    assert.doesNotMatch(html, /<blockquote/);
  });
});

describe("magic-link", () => {
  it("names the lifetime the caller issued", async () => {
    const html = await render(
      <SignInMagicLink
        email="john.doe@example.com"
        link="https://example.com/entrar"
        expiresInMinutes={15}
      />,
    );

    assert.match(html, /15 minuts/);
    // A returning member's link, so no onboarding framing.
    assert.doesNotMatch(html, /primer cop/);
  });
});

describe("invitation-cancelled", () => {
  it("distinguishes an expiry from a cancellation", async () => {
    const expired = await render(
      <InvitationCancelled email="john.doe@example.com" reason="expired" />,
    );
    const cancelled = await render(
      <InvitationCancelled email="john.doe@example.com" reason="cancelled" />,
    );

    assert.match(expired, /ha caducat/);
    assert.match(cancelled, /hem cancel/);
    assert.doesNotMatch(cancelled, /ha caducat/);
  });
});
