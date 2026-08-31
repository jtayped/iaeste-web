import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import type { Database } from "@repo/db/client";
import { createCampaignRepository } from "@repo/db/repositories";
import { closeTestDb, getTestDb, truncateAll } from "@repo/db/test-support";
import { createTestCampaign } from "@repo/db/test-support/fixtures";
import type { Emailer, SendEmailOptions } from "@repo/email/resend";

import {
  createRegistrationChallengeService,
  RegistrationsClosedError,
} from "./registration-challenge-service";

function createRecordingEmailer(): Emailer & { sent: SendEmailOptions[] } {
  const sent: SendEmailOptions[] = [];
  return {
    sent,
    async send(options) {
      sent.push(options);
    },
  };
}

function tokenFrom(sent: SendEmailOptions): string {
  const match = /#token=([a-f0-9]{64})/i.exec(JSON.stringify(sent.react));
  assert.ok(match?.[1], "no verification token in the sent email");
  return match[1];
}

let addressCounter = 0;
function freshEmails() {
  addressCounter += 1;
  return {
    universityEmail: `person-${addressCounter}@alumnes.udl.cat`,
    personalEmail: `person-${addressCounter}@example.com`,
  };
}

describe("registration draft service", () => {
  let db: Database;

  before(async () => {
    db = await getTestDb();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  after(async () => {
    await closeTestDb();
  });

  async function openCampaign() {
    const campaign = await createTestCampaign(db);
    return createCampaignRepository(db).setRegistrationOpen(campaign.id);
  }

  it("refuses to start when no campaign is open", async () => {
    const service = createRegistrationChallengeService({
      db,
      emailer: createRecordingEmailer(),
    });
    await assert.rejects(
      () => service.start(freshEmails()),
      RegistrationsClosedError,
    );
  });

  it("sends two links and becomes ready only after both are opened", async () => {
    await openCampaign();
    const emailer = createRecordingEmailer();
    const service = createRegistrationChallengeService({ db, emailer });
    const emails = freshEmails();

    await service.start(emails);
    assert.equal(emailer.sent.length, 2);
    assert.deepEqual(
      new Set(emailer.sent.map((message) => message.to)),
      new Set([emails.universityEmail, emails.personalEmail]),
    );

    const universityMessage = emailer.sent.find(
      (message) => message.to === emails.universityEmail,
    );
    const personalMessage = emailer.sent.find(
      (message) => message.to === emails.personalEmail,
    );
    assert.ok(universityMessage && personalMessage);

    const first = await service.verifyLink(tokenFrom(universityMessage));
    assert.ok(first);
    assert.equal(first.ready, false);
    assert.equal(first.emails.university?.verified, true);
    assert.equal(first.emails.personal?.verified, false);
    assert.equal(await service.resolveSession(first.token), undefined);

    const second = await service.verifyLink(tokenFrom(personalMessage));
    assert.ok(second?.ready);
    const resolved = await service.resolveSession(second.token);
    assert.ok(resolved?.draftId);
    assert.equal(resolved.universityEmail, emails.universityEmail);
    assert.equal(resolved.personalEmail, emails.personalEmail);

    const resumed = await service.resume(first.token);
    assert.equal(resumed?.ready, true);
  });

  it("becomes ready with a single supplied address, and never asks for the other", async () => {
    await openCampaign();
    const emailer = createRecordingEmailer();
    const service = createRegistrationChallengeService({ db, emailer });
    addressCounter += 1;
    const universityEmail = `solo-${addressCounter}@alumnes.udl.cat`;

    await service.start({ universityEmail });
    assert.equal(emailer.sent.length, 1);
    assert.equal(emailer.sent[0]?.to, universityEmail);

    const session = await service.verifyLink(tokenFrom(emailer.sent[0]!));
    assert.ok(session?.ready);
    assert.equal(session.emails.university?.verified, true);
    assert.equal(session.emails.personal, undefined);

    const resolved = await service.resolveSession(session.token);
    assert.equal(resolved?.universityEmail, universityEmail);
    assert.equal(resolved?.personalEmail, undefined);

    // Nothing to resend for a kind that was never supplied.
    await service.resend(session.token, "personal");
    assert.equal(emailer.sent.length, 1);
  });

  it("verification links are single use", async () => {
    await openCampaign();
    const emailer = createRecordingEmailer();
    const service = createRegistrationChallengeService({ db, emailer });
    await service.start(freshEmails());
    const token = tokenFrom(emailer.sent[0]!);
    assert.ok(await service.verifyLink(token));
    assert.equal(await service.verifyLink(token), undefined);
  });

  it("spends a completed draft once", async () => {
    await openCampaign();
    const emailer = createRecordingEmailer();
    const service = createRegistrationChallengeService({ db, emailer });
    await service.start(freshEmails());
    await service.verifyLink(tokenFrom(emailer.sent[0]!));
    const complete = await service.verifyLink(tokenFrom(emailer.sent[1]!));
    assert.ok(complete);
    assert.equal(await service.consumeSession(complete.token), true);
    assert.equal(await service.consumeSession(complete.token), false);
  });

  it("does not expose mail-provider failures", async () => {
    await openCampaign();
    const service = createRegistrationChallengeService({
      db,
      emailer: {
        async send() {
          throw new Error("Resend is down");
        },
      },
    });
    await assert.doesNotReject(() => service.start(freshEmails()));
  });
});
