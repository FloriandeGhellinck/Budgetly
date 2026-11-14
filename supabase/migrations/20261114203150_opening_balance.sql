ALTER TABLE "accounts" ADD COLUMN "opening_balance_minor" bigint;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "opening_balance_on" date;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_opening_balance_pair" CHECK (("accounts"."opening_balance_minor" is null) = ("accounts"."opening_balance_on" is null));