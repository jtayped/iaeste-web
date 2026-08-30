CREATE TABLE "email_challenge" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"session_token_hash" text,
	"session_expires_at" timestamp with time zone,
	"session_consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "email_challenge_email_idx" ON "email_challenge" USING btree ("email");--> statement-breakpoint
CREATE INDEX "email_challenge_session_idx" ON "email_challenge" USING btree ("session_token_hash");