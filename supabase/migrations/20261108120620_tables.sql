CREATE TYPE "public"."category_kind" AS ENUM('spending', 'saving');--> statement-breakpoint
CREATE TYPE "public"."direction" AS ENUM('expense', 'income', 'transfer_out', 'transfer_in');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"share_bps" integer DEFAULT 10000 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_user_id_id_key" UNIQUE("user_id","id"),
	CONSTRAINT "accounts_share_bps_range" CHECK ("accounts"."share_bps" between 1 and 10000)
);
--> statement-breakpoint
CREATE TABLE "beneficiaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"seed_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beneficiaries_user_id_id_key" UNIQUE("user_id","id"),
	CONSTRAINT "beneficiaries_user_id_seed_key_key" UNIQUE("user_id","seed_key")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"direction" "direction" NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"seed_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_user_id_id_direction_key" UNIQUE("user_id","id","direction"),
	CONSTRAINT "categories_user_id_seed_key_key" UNIQUE("user_id","seed_key")
);
--> statement-breakpoint
CREATE TABLE "category_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "category_kind",
	"direction" "direction" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"seed_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_groups_user_id_id_direction_key" UNIQUE("user_id","id","direction"),
	CONSTRAINT "category_groups_user_id_seed_key_key" UNIQUE("user_id","seed_key"),
	CONSTRAINT "category_groups_direction" CHECK ("category_groups"."direction" in ('expense', 'income')),
	CONSTRAINT "category_groups_kind_expense_only" CHECK (("category_groups"."direction" = 'expense') = ("category_groups"."kind" is not null))
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_user_id_id_key" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "transaction_tags" (
	"user_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "transaction_tags_transaction_id_tag_id_pk" PRIMARY KEY("transaction_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"direction" "direction" NOT NULL,
	"amount_minor" integer NOT NULL,
	"occurred_on" date NOT NULL,
	"name" text NOT NULL,
	"note" text,
	"category_id" uuid,
	"beneficiary_id" uuid,
	"transfer_id" uuid,
	"idempotency_key" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_user_id_id_key" UNIQUE("user_id","id"),
	CONSTRAINT "transactions_user_id_idempotency_key_key" UNIQUE("user_id","idempotency_key"),
	CONSTRAINT "transactions_transfer_leg_key" UNIQUE("user_id","transfer_id","direction"),
	CONSTRAINT "transactions_amount_minor_positive" CHECK ("transactions"."amount_minor" > 0),
	CONSTRAINT "transactions_transfer_shape" CHECK (("transactions"."direction" in ('transfer_out', 'transfer_in') and "transactions"."transfer_id" is not null and "transactions"."category_id" is null and "transactions"."beneficiary_id" is null)
        or ("transactions"."direction" in ('expense', 'income') and "transactions"."transfer_id" is null))
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_group_fk" FOREIGN KEY ("user_id","group_id","direction") REFERENCES "public"."category_groups"("user_id","id","direction") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "category_groups" ADD CONSTRAINT "category_groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_transaction_fk" FOREIGN KEY ("user_id","transaction_id") REFERENCES "public"."transactions"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_tag_fk" FOREIGN KEY ("user_id","tag_id") REFERENCES "public"."tags"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_fk" FOREIGN KEY ("user_id","account_id") REFERENCES "public"."accounts"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_fk" FOREIGN KEY ("user_id","category_id","direction") REFERENCES "public"."categories"("user_id","id","direction") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_beneficiary_fk" FOREIGN KEY ("user_id","beneficiary_id") REFERENCES "public"."beneficiaries"("user_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_id_name_key" ON "tags" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE INDEX "transaction_tags_tag_id_idx" ON "transaction_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "transactions_user_id_occurred_on_idx" ON "transactions" USING btree ("user_id","occurred_on");