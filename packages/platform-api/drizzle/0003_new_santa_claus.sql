CREATE TABLE "event_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(100) NOT NULL,
	"payload" text NOT NULL,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"next_retry_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "event_queue_type_idx" ON "event_queue" USING btree ("type");--> statement-breakpoint
CREATE INDEX "event_queue_status_idx" ON "event_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_queue_priority_idx" ON "event_queue" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "event_queue_next_retry_at_idx" ON "event_queue" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX "event_queue_created_at_idx" ON "event_queue" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "event_queue_status_retry_idx" ON "event_queue" USING btree ("status","next_retry_at");