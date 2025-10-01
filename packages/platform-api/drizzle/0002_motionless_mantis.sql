CREATE TABLE "approval_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"approval_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"attachments" text,
	"mentioned_users" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_comments_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "approval_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"approval_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"performed_by" integer NOT NULL,
	"from_value" text,
	"to_value" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"requested_by" integer NOT NULL,
	"assigned_to" integer,
	"processed_by" integer,
	"data" text,
	"reason" text NOT NULL,
	"attachments" text,
	"tags" text,
	"expected_resolution" timestamp,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approvals_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
ALTER TABLE "approval_comments" ADD CONSTRAINT "approval_comments_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_comments" ADD CONSTRAINT "approval_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_history" ADD CONSTRAINT "approval_history_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_history" ADD CONSTRAINT "approval_history_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approval_comments_approval_idx" ON "approval_comments" USING btree ("approval_id");--> statement-breakpoint
CREATE INDEX "approval_comments_user_idx" ON "approval_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "approval_comments_created_at_idx" ON "approval_comments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "approval_history_approval_idx" ON "approval_history" USING btree ("approval_id");--> statement-breakpoint
CREATE INDEX "approval_history_action_idx" ON "approval_history" USING btree ("action");--> statement-breakpoint
CREATE INDEX "approval_history_performed_by_idx" ON "approval_history" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX "approval_history_created_at_idx" ON "approval_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "approvals_type_idx" ON "approvals" USING btree ("type");--> statement-breakpoint
CREATE INDEX "approvals_entity_idx" ON "approvals" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "approvals_status_idx" ON "approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "approvals_priority_idx" ON "approvals" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "approvals_requested_by_idx" ON "approvals" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "approvals_assigned_to_idx" ON "approvals" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "approvals_expected_resolution_idx" ON "approvals" USING btree ("expected_resolution");