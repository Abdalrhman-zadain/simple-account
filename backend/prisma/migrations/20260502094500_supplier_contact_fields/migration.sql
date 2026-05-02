-- Add structured supplier contact fields used by the Purchases supplier editor.
ALTER TABLE "Supplier"
ADD COLUMN "phone" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "address" TEXT;
