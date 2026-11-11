ALTER TABLE "categories" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "icon" text;--> statement-breakpoint
ALTER TABLE "category_groups" ADD COLUMN "color" text DEFAULT 'slate' NOT NULL;--> statement-breakpoint
ALTER TABLE "category_groups" ADD COLUMN "icon" text DEFAULT 'folder' NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_color" CHECK ("categories"."color" in ('blue', 'teal', 'green', 'amber', 'orange', 'red', 'pink', 'violet', 'slate'));--> statement-breakpoint
ALTER TABLE "category_groups" ADD CONSTRAINT "category_groups_color" CHECK ("category_groups"."color" in ('blue', 'teal', 'green', 'amber', 'orange', 'red', 'pink', 'violet', 'slate'));