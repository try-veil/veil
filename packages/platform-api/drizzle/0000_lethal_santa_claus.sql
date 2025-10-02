CREATE TABLE "api_allowed_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_id" integer NOT NULL,
	"method" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" integer NOT NULL,
	"key_value" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_uid_unique" UNIQUE("uid"),
	CONSTRAINT "api_keys_key_value_unique" UNIQUE("key_value")
);
--> statement-breakpoint
CREATE TABLE "api_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"api_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"review" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_required_headers" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_id" integer NOT NULL,
	"header_name" varchar(100) NOT NULL,
	"header_value" varchar(255),
	"is_static" boolean DEFAULT false NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"api_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"requests_used" integer DEFAULT 0 NOT NULL,
	"requests_limit" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_subscriptions_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "api_usage_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"successful_requests" integer DEFAULT 0 NOT NULL,
	"failed_requests" integer DEFAULT 0 NOT NULL,
	"avg_response_time" numeric(8, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apis" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" integer NOT NULL,
	"category_id" integer,
	"name" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"version" varchar(50) DEFAULT '1.0.0' NOT NULL,
	"endpoint" varchar(500) NOT NULL,
	"base_url" varchar(500) NOT NULL,
	"documentation" text,
	"price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"pricing_model" varchar(50) DEFAULT 'per_request' NOT NULL,
	"request_limit" integer DEFAULT 1000 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"average_rating" numeric(3, 2) DEFAULT '0.00',
	"total_ratings" integer DEFAULT 0 NOT NULL,
	"total_subscriptions" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "apis_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "payment_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"status" varchar(20) NOT NULL,
	"payment_provider" varchar(50) NOT NULL,
	"payment_provider_transaction_id" varchar(255),
	"payment_method" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_records_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"role" varchar(20) DEFAULT 'buyer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_uid_unique" UNIQUE("uid"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "api_allowed_methods" ADD CONSTRAINT "api_allowed_methods_api_id_apis_id_fk" FOREIGN KEY ("api_id") REFERENCES "public"."apis"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_subscription_id_api_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."api_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_ratings" ADD CONSTRAINT "api_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_ratings" ADD CONSTRAINT "api_ratings_api_id_apis_id_fk" FOREIGN KEY ("api_id") REFERENCES "public"."apis"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_required_headers" ADD CONSTRAINT "api_required_headers_api_id_apis_id_fk" FOREIGN KEY ("api_id") REFERENCES "public"."apis"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_subscriptions" ADD CONSTRAINT "api_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_subscriptions" ADD CONSTRAINT "api_subscriptions_api_id_apis_id_fk" FOREIGN KEY ("api_id") REFERENCES "public"."apis"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_analytics" ADD CONSTRAINT "api_usage_analytics_subscription_id_api_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."api_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apis" ADD CONSTRAINT "apis_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apis" ADD CONSTRAINT "apis_category_id_api_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."api_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_subscription_id_api_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."api_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_methods_api_idx" ON "api_allowed_methods" USING btree ("api_id");--> statement-breakpoint
CREATE INDEX "api_methods_method_idx" ON "api_allowed_methods" USING btree ("method");--> statement-breakpoint
CREATE INDEX "api_keys_subscription_idx" ON "api_keys" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "api_keys_value_idx" ON "api_keys" USING btree ("key_value");--> statement-breakpoint
CREATE INDEX "api_keys_active_idx" ON "api_keys" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "ratings_user_api_idx" ON "api_ratings" USING btree ("user_id","api_id");--> statement-breakpoint
CREATE INDEX "api_headers_api_idx" ON "api_required_headers" USING btree ("api_id");--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "api_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_api_idx" ON "api_subscriptions" USING btree ("api_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "api_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "analytics_subscription_idx" ON "api_usage_analytics" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "analytics_date_idx" ON "api_usage_analytics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "apis_seller_idx" ON "apis" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "apis_category_idx" ON "apis" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "apis_active_idx" ON "apis" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "apis_public_idx" ON "apis" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "payments_subscription_idx" ON "payment_records" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payment_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_created_at_idx" ON "payment_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_uid_idx" ON "users" USING btree ("uid");