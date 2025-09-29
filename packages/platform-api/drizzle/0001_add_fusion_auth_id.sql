ALTER TABLE "users" ADD COLUMN "fusion_auth_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_fusion_auth_id_unique" UNIQUE("fusion_auth_id");--> statement-breakpoint
CREATE INDEX "users_fusion_auth_id_idx" ON "users" USING btree ("fusion_auth_id");