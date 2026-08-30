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

/**
 * The code only ever exists in the email, so the test reads it back out of
 * the recorded send — exactly the path a real applicant takes, and proof that
 * nothing else in the response leaks it.
 */
function codeFrom(sent: SendEmailOptions): string {
  const match = /(\d{3}) (\d{3})/.exec(JSON.stringify(sent.react));
  assert.ok(match, "no six-digit code in the sent email");
  return `${match[1]}${match[2]}`;
}

/**
 * The per-address cooldown lives in a process-wide `Map`, so two tests that
 * share an address would have the second one silently skip its send. A fresh
 * address per test is what keeps them independent.
 */
let addressCounter = 0;
function freshAddress(): string {
  addressCounter += 1;
  return `person-${addressCounter}@alumnes.udl.cat`;
}

describe("registration challenge service", () => {
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
      () => service.start(freshAddress()),
      RegistrationsClosedError,
    );
  });

  it("mails a six-digit code and trades it for a session", async () => {
    await openCampaign();
    const emailer = createRecordingEmailer();
    const service = createRegistrationChallengeService({ db, emailer });
    const email = freshAddress();

    await service.start(email);

    assert.equal(emailer.sent.length, 1);
    assert.equal(emailer.sent[0]?.to, email);
    assert.equal(
      emailer.sent[0]?.subject,
      "el teu codi d'inscripció · iaeste lc lleida",
    );

    const session = await service.verifyCode(email, codeFrom(emailer.sent[0]!));

    assert.ok(session);
    assert.equal(session?.email, email);
    // Nobody by that address has ever been near us.
    assert.equal(session?.known, false);
    assert.equal(session?.profile, null);
    assert.equal(await service.resolveSession(session!.token), email);
  });

  it("rejects a code issued for a different address", async () => {
    await openCampaign();
    const emailer = createRecordingEmailer();
    const service = createRegistrationChallengeService({ db, emailer });

    const mine = freshAddress();
    const theirs = freshAddress();
    await service.start(mine);
    await service.start(theirs);

    assert.equal(
      await service.verifyCode(theirs, codeFrom(emailer.sent[0]!)),
      undefined,
    );
  });

  it("gives up on a challenge after five wrong guesses", async () => {
    await openCampaign();
    const emailer = createRecordingEmailer();
    const service = createRegistrationChallengeService({ db, emailer });

    const email = freshAddress();
    await service.start(email);
    const real = codeFrom(emailer.sent[0]!);
    const wrong = real === "000000" ? "111111" : "000000";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.equal(await service.verifyCode(email, wrong), undefined);
    }

    // A six-digit code is 20 bits; the attempt cap, not the length, is what
    // makes it unguessable. Even the right code stops working after it.
    assert.equal(await service.verifyCode(email, real), undefined);
  });

  it("spends a session once, so a resubmitted form cannot register twice", async () => {
    await openCampaign();
    const emailer = createRecordingEmailer();
    const service = createRegistrationChallengeService({ db, emailer });

    const email = freshAddress();
    await service.start(email);
    const session = await service.verifyCode(email, codeFrom(emailer.sent[0]!));

    assert.equal(await service.consumeSession(session!.token), email);
    assert.equal(await service.consumeSession(session!.token), undefined);
  });

  it("survives a mail provider that is down", async () => {
    await openCampaign();
    const service = createRegistrationChallengeService({
      db,
      emailer: {
        async send() {
          throw new Error("Resend is down");
        },
      },
    });

    // Failing here would tell a prober that this address is one the mail
    // provider rejects, which is itself a signal worth hiding.
    await assert.doesNotReject(() => service.start(freshAddress()));
  });
});
