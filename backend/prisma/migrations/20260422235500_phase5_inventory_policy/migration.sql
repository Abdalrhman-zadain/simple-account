-- CreateTable
CREATE TABLE "InventoryPolicy" (
    "id" TEXT NOT NULL,
    "costingMethod" "InventoryCostingMethod" NOT NULL DEFAULT 'WEIGHTED_AVERAGE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryPolicy_pkey" PRIMARY KEY ("id")
);

-- Seed singleton inventory policy row
INSERT INTO "InventoryPolicy" ("id", "costingMethod", "createdAt", "updatedAt")
VALUES ('default', 'WEIGHTED_AVERAGE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
