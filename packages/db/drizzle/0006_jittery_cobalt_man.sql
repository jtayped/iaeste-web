CREATE TYPE "public"."member_email_kind" AS ENUM('university', 'personal');--> statement-breakpoint
CREATE TABLE "registration_draft" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_draft_email" (
	"id" text PRIMARY KEY NOT NULL,
	"draft_id" text NOT NULL,
	"kind" "member_email_kind" NOT NULL,
	"email" text NOT NULL,
	"verified_at" timestamp with time zone,
	"verification_token_hash" text NOT NULL,
	"verification_expires_at" timestamp with time zone NOT NULL,
	"session_token_hash" text,
	"session_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_email" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"kind" "member_email_kind" NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registration" ADD COLUMN "university_email" text;--> statement-breakpoint
ALTER TABLE "registration" ADD COLUMN "personal_email" text;--> statement-breakpoint
ALTER TABLE "registration_draft" ADD CONSTRAINT "registration_draft_campaign_id_membership_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."membership_campaign"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_draft_email" ADD CONSTRAINT "registration_draft_email_draft_id_registration_draft_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."registration_draft"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_email" ADD CONSTRAINT "user_email_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "user_email" ("id", "user_id", "email", "kind", "verified_at")
SELECT
	'user_email_' || md5("id" || ':' || lower(trim("email"))),
	"id",
	lower(trim("email")),
	CASE
		WHEN split_part(lower(trim("email")), '@', 2) IN ('udl.cat', 'alumnes.udl.cat')
			THEN 'university'::"member_email_kind"
		ELSE 'personal'::"member_email_kind"
	END,
	CASE WHEN "email_verified" THEN COALESCE("updated_at", "created_at") ELSE NULL END
FROM "user";--> statement-breakpoint
UPDATE "registration"
SET "university_email" = lower(trim("email"))
WHERE split_part(lower(trim("email")), '@', 2) IN ('udl.cat', 'alumnes.udl.cat');--> statement-breakpoint
UPDATE "registration"
SET "personal_email" = lower(trim("email"))
WHERE split_part(lower(trim("email")), '@', 2) NOT IN ('udl.cat', 'alumnes.udl.cat');--> statement-breakpoint
CREATE INDEX "registration_draft_expiry_idx" ON "registration_draft" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "registration_draft_email_kind_key" ON "registration_draft_email" USING btree ("draft_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "registration_draft_email_verification_token_key" ON "registration_draft_email" USING btree ("verification_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "registration_draft_email_session_token_key" ON "registration_draft_email" USING btree ("session_token_hash");--> statement-breakpoint
CREATE INDEX "registration_draft_email_address_idx" ON "registration_draft_email" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_address_key" ON "user_email" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_user_kind_key" ON "user_email" USING btree ("user_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "registration_campaign_university_email_key" ON "registration" USING btree ("campaign_id","university_email");--> statement-breakpoint
CREATE UNIQUE INDEX "registration_campaign_personal_email_key" ON "registration" USING btree ("campaign_id","personal_email");
