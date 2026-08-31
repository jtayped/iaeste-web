import { and, eq, inArray } from "drizzle-orm";

import { isUniversityEmail } from "@repo/constants/validators/member-email";

import type { Db } from "../client";
import { user } from "../schema/auth";
import { memberProfile } from "../schema/member-profile";
import { registration } from "../schema/registration";
import { userEmail } from "../schema/user-email";
import { IllegalTransitionError, NotFoundError } from "./errors";
import { createMembershipRepository } from "./memberships";
import type {
  AcceptRegistrationInput,
  RegistrationProfileSnapshot,
} from "./registrations";
import { firstOrThrow } from "./util";

export async function acceptRegistrationTx(
  tx: Db,
  registrationId: string,
  input: AcceptRegistrationInput,
) {
  const [accepted] = await tx
    .update(registration)
    .set({
      status: "accepted",
      reviewedAt: new Date(),
      reviewerId: input.reviewerId,
    })
    .where(
      and(
        eq(registration.id, registrationId),
        eq(registration.status, "pending_review"),
      ),
    )
    .returning();

  if (!accepted) {
    const [row] = await tx
      .select({ status: registration.status })
      .from(registration)
      .where(eq(registration.id, registrationId));
    if (!row)
      throw new NotFoundError(`No registration with id ${registrationId}`);
    throw new IllegalTransitionError(
      `Cannot transition registration ${registrationId}: expected status pending_review, found ${row.status}`,
    );
  }

  const snapshot = accepted.profileSnapshot as RegistrationProfileSnapshot;
  const addresses = [
    accepted.universityEmail,
    accepted.personalEmail,
    accepted.email,
  ].filter((email): email is string => Boolean(email));
  const [aliases, canonicalUsers] = await Promise.all([
    tx
      .select({ id: userEmail.userId })
      .from(userEmail)
      .where(inArray(userEmail.email, addresses)),
    tx.select({ id: user.id }).from(user).where(inArray(user.email, addresses)),
  ]);
  const userIds = new Set([
    ...aliases.map((row) => row.id),
    ...canonicalUsers.map((row) => row.id),
  ]);
  if (userIds.size > 1) {
    throw new Error(
      "Cannot accept a registration whose addresses belong to different users.",
    );
  }
  const existingId = userIds.values().next().value as string | undefined;
  const [existingUser] = existingId
    ? await tx.select().from(user).where(eq(user.id, existingId))
    : [];
  const memberUser =
    existingUser ??
    firstOrThrow(
      await tx
        .insert(user)
        .values({
          id: crypto.randomUUID(),
          name: `${snapshot.name} ${snapshot.surnames}`.trim(),
          email: accepted.personalEmail ?? accepted.email,
          emailVerified: true,
        })
        .returning(),
    );

  const verifiedAt = accepted.verifiedAt ?? new Date();
  const emailRows = [
    accepted.universityEmail
      ? {
          userId: memberUser.id,
          email: accepted.universityEmail,
          kind: "university" as const,
          verifiedAt,
        }
      : undefined,
    accepted.personalEmail
      ? {
          userId: memberUser.id,
          email: accepted.personalEmail,
          kind: "personal" as const,
          verifiedAt,
        }
      : undefined,
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));
  if (emailRows.length === 0) {
    emailRows.push({
      userId: memberUser.id,
      email: accepted.email,
      kind: isUniversityEmail(accepted.email) ? "university" : "personal",
      verifiedAt,
    });
  }
  for (const emailRow of emailRows) {
    await tx
      .insert(userEmail)
      .values(emailRow)
      .onConflictDoUpdate({
        target: [userEmail.userId, userEmail.kind],
        set: {
          email: emailRow.email,
          verifiedAt: emailRow.verifiedAt,
          updatedAt: new Date(),
        },
      });
  }

  await tx
    .insert(memberProfile)
    .values({
      userId: memberUser.id,
      name: snapshot.name,
      surnames: snapshot.surnames,
      phoneE164: snapshot.phoneE164,
      phoneDisplay: snapshot.phoneDisplay,
      degree: snapshot.degree,
      studyYear: snapshot.studyYear,
    })
    .onConflictDoUpdate({
      target: memberProfile.userId,
      set: {
        name: snapshot.name,
        surnames: snapshot.surnames,
        phoneE164: snapshot.phoneE164,
        phoneDisplay: snapshot.phoneDisplay,
        degree: snapshot.degree,
        studyYear: snapshot.studyYear,
      },
    });

  const membershipRow = await createMembershipRepository(tx).join({
    userId: memberUser.id,
    campaignId: accepted.campaignId,
    source: input.membershipSource ?? "registration",
    actorId: input.reviewerId,
  });
  return {
    registration: accepted,
    user: memberUser,
    membership: membershipRow,
  };
}
