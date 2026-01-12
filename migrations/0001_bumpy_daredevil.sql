CREATE TABLE "loan_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_interest_ranges" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"from_days" integer NOT NULL,
	"to_days" integer NOT NULL,
	"interest_percent" numeric(5, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form_fields" ADD COLUMN "value" varchar(255);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "loan_category_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_interest_ranges" ADD CONSTRAINT "loan_interest_ranges_category_id_loan_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."loan_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_loan_category_id_loan_categories_id_fk" FOREIGN KEY ("loan_category_id") REFERENCES "public"."loan_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" DROP COLUMN "interest_rate";--> statement-breakpoint
ALTER TABLE "loans" DROP COLUMN "duration";--> statement-breakpoint
ALTER TABLE "loans" DROP COLUMN "due_date";