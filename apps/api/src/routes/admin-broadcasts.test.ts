import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";

import type { Database } from "@repo/db/client";
import type { BatchEmail } from "@repo/email/resend";
import { closeTestDb, getTestDb, truncateAll } from "@repo/db/test-support";
import { createTestCampaign } from "@repo/db/test-support/fixtures";

import {
  makeApp,
  post,
  recordingEmailer,
  seedMember,
  seedRegistration,
} from "../test-support/broadcasts";

const CONTENT = {
  subject: "assemblea general",
  body: "hola {{nom}},\n\nens veiem **dijous**.",
};

describe("admin broadcasts", () => {
  let db: Database;

  before(async () => {
    db = await getTestDb();
  });
  afterEach(async () => {
    await truncateAll(db);
  });
  after(async () => {
    await closeTestDb();
  });

  it("403s a member on every broadcast route", async () => {
    const a = makeApp(db, recordingEmailer().emailer, "member");
    for (const path of [
      "/v1/admin/broadcasts",
      "/v1/admin/broadcasts/recipients",
      "/v1/admin/broadcasts/preview",
      "/v1/admin/broadcasts/test",
    ]) {
      assert.equal((await post(a, path, {})).status, 403, path);
    }
  });

  it("resolves a registrations selection to addresses and a sample", async () => {
    const campaign = await createTestCampaign(db);
    const aina = await seedRegistration(db, campaign.id, "Aina");
    await seedRegistration(db, campaign.id, "Berta");
    const a = makeApp(db, recordingEmailer().emailer);

    const response = await post(a, "/v1/admin/broadcasts/recipients", {
      audience: {
        kind: "registrations",
        selection: {
          mode: "all",
          campaignId: campaign.id,
          status: "pending_review",
          excludedRowIds: [aina.id],
        },
      },
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.total, 1);
    assert.equal(body.sample[0].name, "Berta");
    assert.equal(body.truncated, false);
  });

  it("counts one person once when two selected rows resolve to the same address", async () => {
    const campaign = await createTestCampaign(db);
    // One row reaches this address as its sign-up address and the other names
    // it as a personal one. The unique indexes allow that pair, and a
    // broadcast must still put one message in that inbox, not two.
    await seedRegistration(db, campaign.id, "Aina", {
      email: "shared@example.com",
      universityEmail: null,
      personalEmail: null,
    });
    await seedRegistration(db, campaign.id, "Berta", {
      personalEmail: "shared@example.com",
    });
    const a = makeApp(db, recordingEmailer().emailer);

    const response = await post(a, "/v1/admin/broadcasts/recipients", {
      audience: {
        kind: "registrations",
        selection: { mode: "all", campaignId: campaign.id, excludedRowIds: [] },
      },
    });

    assert.equal((await response.json()).total, 1);
  });

  it("previews the message personalised for the first real recipient", async () => {
    const campaign = await createTestCampaign(db);
    await seedRegistration(db, campaign.id, "Aina");
    const a = makeApp(db, recordingEmailer().emailer);

    const response = await post(a, "/v1/admin/broadcasts/preview", {
      content: CONTENT,
      audience: {
        kind: "registrations",
        selection: { mode: "all", campaignId: campaign.id, excludedRowIds: [] },
      },
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.sampleRecipient.name, "Aina");
    assert.match(body.html, /hola Aina/);
    // Markdown became email HTML rather than staying as asterisks.
    assert.match(body.html, /<strong[^>]*>dijous<\/strong>/);
    assert.doesNotMatch(body.html, /\{\{nom\}\}/);
  });

  it("previews with obvious stand-ins when no audience is given", async () => {
    const a = makeApp(db, recordingEmailer().emailer);

    const body = await (
      await post(a, "/v1/admin/broadcasts/preview", { content: CONTENT })
    ).json();

    assert.equal(body.sampleRecipient, null);
    assert.match(body.html, /hola Nom/);
  });

  it("refuses a body that uses a placeholder which does not exist", async () => {
    const a = makeApp(db, recordingEmailer().emailer);

    const response = await post(a, "/v1/admin/broadcasts/preview", {
      content: { subject: "assemblea", body: "hola {{name}}" },
    });

    assert.equal(response.status, 422);
  });

  it("sends one separate email per person, each personalised", async () => {
    const campaign = await createTestCampaign(db);
    await seedRegistration(db, campaign.id, "Aina");
    await seedRegistration(db, campaign.id, "Berta");
    const recorder = recordingEmailer();
    const a = makeApp(db, recorder.emailer);

    const response = await post(a, "/v1/admin/broadcasts", {
      audience: {
        kind: "registrations",
        selection: { mode: "all", campaignId: campaign.id, excludedRowIds: [] },
      },
      content: CONTENT,
      expectedRecipients: 2,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      requested: 2,
      sent: 2,
      failed: [],
    });

    // Two messages, one address each — never one message addressed to both,
    // which would publish the whole list to everyone on it.
    assert.equal(recorder.all.length, 2);
    const aina = recorder.all.find((email: BatchEmail) =>
      email.to.startsWith("aina"),
    );
    assert.ok(aina);
    assert.match(aina.html, /hola Aina/);
    assert.doesNotMatch(aina.html, /Berta/);
  });

  it("refuses to send when the audience changed since it was confirmed", async () => {
    const campaign = await createTestCampaign(db);
    await seedRegistration(db, campaign.id, "Aina");
    const recorder = recordingEmailer();
    const a = makeApp(db, recorder.emailer);

    const response = await post(a, "/v1/admin/broadcasts", {
      audience: {
        kind: "registrations",
        selection: { mode: "all", campaignId: campaign.id, excludedRowIds: [] },
      },
      content: CONTENT,
      // The composer showed five people; only one is there now.
      expectedRecipients: 5,
    });

    assert.equal(response.status, 409);
    assert.equal(recorder.all.length, 0);
  });

  it("names the addresses the provider refused and still reports the rest as sent", async () => {
    const campaign = await createTestCampaign(db);
    await seedRegistration(db, campaign.id, "Aina");
    await seedRegistration(db, campaign.id, "Berta");
    const recorder = recordingEmailer({
      failFor: ["berta@alumnes.udl.cat"],
    });
    const a = makeApp(db, recorder.emailer);

    const body = await (
      await post(a, "/v1/admin/broadcasts", {
        audience: {
          kind: "registrations",
          selection: {
            mode: "all",
            campaignId: campaign.id,
            excludedRowIds: [],
          },
        },
        content: CONTENT,
        expectedRecipients: 2,
      })
    ).json();

    assert.equal(body.sent, 1);
    assert.deepEqual(body.failed, [
      { email: "berta@alumnes.udl.cat", reason: "mailbox full" },
    ]);
  });

  it("reaches members from the members table with the same composer", async () => {
    const campaign = await createTestCampaign(db);
    await seedMember(db, campaign.id, "Carla");
    const recorder = recordingEmailer();
    const a = makeApp(db, recorder.emailer);

    const response = await post(a, "/v1/admin/broadcasts", {
      audience: {
        kind: "members",
        selection: { mode: "all", excludedRowIds: [] },
      },
      content: CONTENT,
      expectedRecipients: 1,
    });

    assert.equal(response.status, 200);
    assert.equal(recorder.all.length, 1);
    assert.match(recorder.all[0]!.html, /hola Carla/);
  });

  it("sends a test to the signed-in admin and never to a chosen address", async () => {
    const recorder = recordingEmailer();
    const a = makeApp(db, recorder.emailer);

    const response = await post(a, "/v1/admin/broadcasts/test", {
      content: CONTENT,
      // Deliberately passed: the route must ignore anything like it and use
      // the session's address, or it becomes an open relay over our domain.
      to: "victim@example.com",
    });

    assert.equal(response.status, 200);
    assert.equal((await response.json()).sentTo, "cap@iaestelleida.cat");
    assert.deepEqual(
      recorder.singles.map((email: { to: string }) => email.to),
      ["cap@iaestelleida.cat"],
    );
    assert.match(recorder.singles[0]!.subject, /^\[prova\]/);
  });
});
