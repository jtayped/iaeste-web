CREATE TYPE "public"."membership_campaign_state" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."registration_status" AS ENUM('pending_email', 'pending_review', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'left', 'kicked');--> statement-breakpoint
CREATE TYPE "public"."member_invitation_role" AS ENUM('member', 'admin');--> statement-breakpoint
CREATE TYPE "public"."member_invitation_status" AS ENUM('pending', 'accepted', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."membership_event_type" AS ENUM('joined', 'renewed', 'left', 'kicked', 'restored', 'invited', 'role_changed');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"surnames" text NOT NULL,
	"phone_e164" text NOT NULL,
	"phone_display" text NOT NULL,
	"degree" text NOT NULL,
	"study_year" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_profile_study_year_range" CHECK ("member_profile"."study_year" between 1 and 6)
);
--> statement-breakpoint
CREATE TABLE "membership_campaign" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"membership_starts_at" timestamp with time zone NOT NULL,
	"membership_ends_at" timestamp with time zone NOT NULL,
	"registration_opens_at" timestamp with time zone NOT NULL,
	"registration_closes_at" timestamp with time zone NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"is_registration_open" boolean DEFAULT false NOT NULL,
	"state" "membership_campaign_state" DEFAULT 'draft' NOT NULL,
	"sheet_tab_name" text,
	"sheet_synced_at" timestamp with time zone,
	"sheet_stale" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_campaign_membership_range" CHECK ("membership_campaign"."membership_ends_at" > "membership_campaign"."membership_starts_at"),
	CONSTRAINT "membership_campaign_registration_range" CHECK ("membership_campaign"."registration_closes_at" > "membership_campaign"."registration_opens_at")
);
--> statement-breakpoint
CREATE TABLE "registration" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"email" text NOT NULL,
	"profile_snapshot" jsonb NOT NULL,
	"source" text DEFAULT 'public_form' NOT NULL,
	"status" "registration_status" DEFAULT 'pending_email' NOT NULL,
	"verification_expires_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewer_id" text,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"registration_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"source" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"ended_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_status_end_fields" CHECK (
        ("membership"."status" = 'active' and "membership"."ended_at" is null and "membership"."ended_reason" is null)
        or ("membership"."status" = 'left' and "membership"."ended_at" is not null)
        or ("membership"."status" = 'kicked' and "membership"."ended_at" is not null and "membership"."ended_reason" is not null)
      )
);
--> statement-breakpoint
CREATE TABLE "member_invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"email" text NOT NULL,
	"inviter_id" text NOT NULL,
	"intended_role" "member_invitation_role" DEFAULT 'member' NOT NULL,
	"token_hash" text NOT NULL,
	"status" "member_invitation_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_event" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" "membership_event_type" NOT NULL,
	"actor_id" text,
	"target_user_id" text NOT NULL,
	"campaign_id" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_profile" ADD CONSTRAINT "member_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration" ADD CONSTRAINT "registration_campaign_id_membership_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."membership_campaign"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration" ADD CONSTRAINT "registration_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_verification" ADD CONSTRAINT "registration_verification_registration_id_registration_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_campaign_id_membership_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."membership_campaign"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_invitation" ADD CONSTRAINT "member_invitation_campaign_id_membership_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."membership_campaign"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_invitation" ADD CONSTRAINT "member_invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_event" ADD CONSTRAINT "membership_event_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_event" ADD CONSTRAINT "membership_event_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_event" ADD CONSTRAINT "membership_event_campaign_id_membership_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."membership_campaign"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_campaign_slug_key" ON "membership_campaign" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_campaign_one_current" ON "membership_campaign" USING btree ((true)) WHERE "membership_campaign"."is_current";--> statement-breakpoint
CREATE UNIQUE INDEX "membership_campaign_one_registration" ON "membership_campaign" USING btree ((true)) WHERE "membership_campaign"."is_registration_open";--> statement-breakpoint
CREATE UNIQUE INDEX "registration_campaign_email_key" ON "registration" USING btree ("campaign_id","email");--> statement-breakpoint
CREATE INDEX "registration_email_idx" ON "registration" USING btree ("email");--> statement-breakpoint
CREATE INDEX "registration_campaign_status_idx" ON "registration" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "registration_verification_registration_idx" ON "registration_verification" USING btree ("registration_id");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_user_campaign_key" ON "membership" USING btree ("user_id","campaign_id");--> statement-breakpoint
CREATE INDEX "membership_active_by_campaign_idx" ON "membership" USING btree ("campaign_id") WHERE "membership"."status" = 'active';--> statement-breakpoint
CREATE INDEX "member_invitation_pending_expiry_idx" ON "member_invitation" USING btree ("expires_at") WHERE "member_invitation"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "membership_event_target_idx" ON "membership_event" USING btree ("target_user_id");