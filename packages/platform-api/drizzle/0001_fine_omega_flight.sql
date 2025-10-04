CREATE TABLE "billing_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" integer NOT NULL,
	"pricing_model_id" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"usage_snapshot" text,
	"calculated_amount" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "billing_periods_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"subscription_id" integer NOT NULL,
	"billing_period_id" integer,
	"user_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"breakdown" text NOT NULL,
	"applied_promotions" text,
	"issue_date" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp NOT NULL,
	"paid_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_uid_unique" UNIQUE("uid"),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "pricing_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"type" varchar(50) NOT NULL,
	"billing_cycle" varchar(20) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"base_price" numeric(10, 2),
	"config_json" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_models_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "pricing_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"pricing_model_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"tier_order" integer NOT NULL,
	"limit_requests" integer,
	"price_per_unit" numeric(10, 6) NOT NULL,
	"base_fee" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"features" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50),
	"name" varchar(200) NOT NULL,
	"description" text,
	"type" varchar(50) NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"max_uses" integer,
	"current_uses" integer DEFAULT 0 NOT NULL,
	"valid_from" timestamp NOT NULL,
	"valid_until" timestamp,
	"conditions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promotions_uid_unique" UNIQUE("uid"),
	CONSTRAINT "promotions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "subscription_pricing_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"pricing_model_id" integer NOT NULL,
	"change_type" varchar(50) NOT NULL,
	"old_pricing_model_id" integer,
	"effective_date" timestamp NOT NULL,
	"proration_credit" numeric(10, 2) DEFAULT '0.00',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key_id" integer NOT NULL,
	"api_id" integer NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"endpoint" varchar(500) NOT NULL,
	"method" varchar(10) NOT NULL,
	"status_code" integer NOT NULL,
	"response_time" integer NOT NULL,
	"request_size" integer DEFAULT 0 NOT NULL,
	"response_size" integer DEFAULT 0 NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45)
);
--> statement-breakpoint
ALTER TABLE "api_subscriptions" ADD COLUMN "pricing_model_id" integer;--> statement-breakpoint
ALTER TABLE "api_usage_analytics" ADD COLUMN "total_data_transferred" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fusion_auth_id" varchar(255);--> statement-breakpoint
ALTER TABLE "billing_periods" ADD CONSTRAINT "billing_periods_subscription_id_api_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."api_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_periods" ADD CONSTRAINT "billing_periods_pricing_model_id_pricing_models_id_fk" FOREIGN KEY ("pricing_model_id") REFERENCES "public"."pricing_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_api_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."api_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_billing_period_id_billing_periods_id_fk" FOREIGN KEY ("billing_period_id") REFERENCES "public"."billing_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_tiers" ADD CONSTRAINT "pricing_tiers_pricing_model_id_pricing_models_id_fk" FOREIGN KEY ("pricing_model_id") REFERENCES "public"."pricing_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_pricing_history" ADD CONSTRAINT "subscription_pricing_history_subscription_id_api_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."api_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_pricing_history" ADD CONSTRAINT "subscription_pricing_history_pricing_model_id_pricing_models_id_fk" FOREIGN KEY ("pricing_model_id") REFERENCES "public"."pricing_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_pricing_history" ADD CONSTRAINT "subscription_pricing_history_old_pricing_model_id_pricing_models_id_fk" FOREIGN KEY ("old_pricing_model_id") REFERENCES "public"."pricing_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_api_id_apis_id_fk" FOREIGN KEY ("api_id") REFERENCES "public"."apis"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_periods_subscription_idx" ON "billing_periods" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "billing_periods_status_idx" ON "billing_periods" USING btree ("status");--> statement-breakpoint
CREATE INDEX "billing_periods_date_idx" ON "billing_periods" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "invoices_subscription_idx" ON "invoices" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "invoices_user_idx" ON "invoices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_due_date_idx" ON "invoices" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "invoices_number_idx" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "pricing_models_type_idx" ON "pricing_models" USING btree ("type");--> statement-breakpoint
CREATE INDEX "pricing_models_active_idx" ON "pricing_models" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "pricing_tiers_model_idx" ON "pricing_tiers" USING btree ("pricing_model_id");--> statement-breakpoint
CREATE INDEX "pricing_tiers_order_idx" ON "pricing_tiers" USING btree ("tier_order");--> statement-breakpoint
CREATE INDEX "promotions_code_idx" ON "promotions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "promotions_active_idx" ON "promotions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "promotions_valid_from_idx" ON "promotions" USING btree ("valid_from");--> statement-breakpoint
CREATE INDEX "promotions_valid_until_idx" ON "promotions" USING btree ("valid_until");--> statement-breakpoint
CREATE INDEX "sub_pricing_history_subscription_idx" ON "subscription_pricing_history" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "sub_pricing_history_date_idx" ON "subscription_pricing_history" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "usage_records_api_key_idx" ON "usage_records" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "usage_records_api_idx" ON "usage_records" USING btree ("api_id");--> statement-breakpoint
CREATE INDEX "usage_records_timestamp_idx" ON "usage_records" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "usage_records_status_idx" ON "usage_records" USING btree ("status_code");--> statement-breakpoint
CREATE INDEX "subscriptions_pricing_model_idx" ON "api_subscriptions" USING btree ("pricing_model_id");--> statement-breakpoint
CREATE INDEX "users_fusion_auth_id_idx" ON "users" USING btree ("fusion_auth_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_fusion_auth_id_unique" UNIQUE("fusion_auth_id");