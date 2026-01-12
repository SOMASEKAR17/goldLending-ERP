ALTER TABLE "form_fields" ADD COLUMN "field_value" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "form_fields" DROP COLUMN "value";