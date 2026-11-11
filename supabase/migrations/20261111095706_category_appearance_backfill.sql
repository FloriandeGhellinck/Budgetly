-- Default colours and icons for rows created before ADR 0034, matching
-- seedNewUser. Only rows still on the column defaults change, so re-running
-- is a no-op and a user's own choice is never overwritten.
UPDATE "category_groups" SET
  "color" = CASE "seed_key"
    WHEN 'daily_life' THEN 'teal'
    WHEN 'leisure' THEN 'orange'
    WHEN 'investment' THEN 'violet'
    WHEN 'debt' THEN 'slate'
    WHEN 'income' THEN 'green'
    ELSE "color" END,
  "icon" = CASE "seed_key"
    WHEN 'daily_life' THEN 'house'
    WHEN 'leisure' THEN 'party-popper'
    WHEN 'investment' THEN 'piggy-bank'
    WHEN 'debt' THEN 'landmark'
    WHEN 'income' THEN 'wallet'
    ELSE "icon" END
WHERE "color" = 'slate' AND "icon" = 'folder';--> statement-breakpoint
-- Categories keep a null colour (inherit the group's); a known default gets
-- its icon, any other category inherits the group's icon.
UPDATE "categories" SET "icon" = CASE "seed_key"
    WHEN 'groceries' THEN 'shopping-cart'
    WHEN 'health' THEN 'pill'
    WHEN 'clothing' THEN 'shirt'
    WHEN 'furniture' THEN 'sofa'
    WHEN 'childcare' THEN 'baby'
    WHEN 'holidays' THEN 'tree-palm'
    WHEN 'outings' THEN 'ticket'
    WHEN 'gifts' THEN 'gift'
    WHEN 'sport' THEN 'dumbbell'
    WHEN 'stocks' THEN 'trending-up'
    WHEN 'crypto' THEN 'bitcoin'
    WHEN 'real_estate' THEN 'building-2'
    WHEN 'loan_repayment' THEN 'hand-coins'
    WHEN 'salary' THEN 'briefcase'
    WHEN 'meal_vouchers' THEN 'utensils'
    WHEN 'other_income' THEN 'coins'
  END
WHERE "icon" IS NULL AND "seed_key" IS NOT NULL;
