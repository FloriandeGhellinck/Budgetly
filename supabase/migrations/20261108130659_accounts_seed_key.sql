ALTER TABLE "accounts" ADD COLUMN "seed_key" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_seed_key_key" UNIQUE("user_id","seed_key");