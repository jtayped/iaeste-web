import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, beforeEach, describe, it } from "node:test";

import type { Database } from "@repo/db/client";
import {
  createCampaignRepository,
  createRegistrationDraftRepository,
} from "@repo/db/repositories";
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

function codeFrom(sent: SendEmailOptions): string {
  const match = /(\d{3}) (\d{3})/.exec(JSON.stringify(sent.react));
  assert.ok(match, "no six-digit code in the sent email");
  return `${match[1]}${match[2]}`;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

let addressCounter = 0;
function freshAddress(domain = "alumnes.udl.cat"): string {
  addressCounter += 1;
  return `person-${addressCounter}@${domain}`;
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
    await createCampaignRepository(db).setRegistrationOpen(campaign.id);
    return campaign;
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

  it("mails a six-digit code and trades it for a resumable session", async () => {
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
    assert.ok(session?.ready);
    assert.equal(session.known, false);
    assert.equal(session.emails.university?.verified, true);
    assert.equal(session.emails.personal, undefined);
    const resolved = await service.resolveSession(session.token);
    assert.ok(resolved?.draftId);
    assert.equal(resolved.universityEmail, email);
    assert.equal(resolved.personalEmail, undefined);

    const resumed = await service.resume(session.token);
    assert.equal(resumed?.token, session.token);
    assert.equal(resumed?.ready, true);
  });

  it("classifies a non-UdL address as personal", async () => {
    await openCampaign();
    const emailer = createRecordingEmailer();
    const service = createRegistrationChallengeService({ db, emailer });
    const email = freshAddress("example.com");

    await service.start(email);
    const session = await service.verifyCode(email, codeFrom(emailer.sent[0]!));

    assert.equal(session?.emails.personal?.verified, true);
    assert.equal(session?.emails.university, undefined);
    assert.equal(
      (await service.resolveSession(session!.token))?.personalEmail,
      email,
    );
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

  it("retires a code after five wrong guesses", async () => {
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
    assert.equal(await service.verifyCode(email, real), undefined);
  });

  it("spends a completed code session once", async () => {
    await openCampaign();
    const emailer = createRecordingEmailer();
    const service = createRegistrationChallengeService({ db, emailer });
    const email = freshAddress();
    await service.start(email);
    const session = await service.verifyCode(email, codeFrom(emailer.sent[0]!));
    assert.ok(session);

    assert.equal(await service.consumeSession(session.token), true);
    assert.equal(await service.consumeSession(session.token), false);
  });

  it("keeps verification links that were already sent working", async () => {
    const campaign = await openCampaign();
    const token = crypto.randomBytes(32).toString("hex");
    const email = freshAddress();
    await createRegistrationDraftRepository(db).create({
      campaignId: campaign.id,
      expiresAt: new Date(Date.now() + 60_000),
      emails: {
        university: {
          email,
          tokenHash: hashToken(token),
          tokenExpiresAt: new Date(Date.now() + 60_000),
        },
      },
    });
    const service = createRegistrationChallengeService({
      db,
      emailer: createRecordingEmailer(),
    });

    const session = await service.verifyLink(token);
    assert.ok(session?.ready);
    assert.equal(session.emails.university?.verified, true);
    assert.equal(await service.verifyLink(token), undefined);
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
    await assert.doesNotReject(() => service.start(freshAddress()));
  });
});
