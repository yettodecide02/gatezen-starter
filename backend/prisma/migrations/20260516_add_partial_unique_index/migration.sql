-- Add partial unique index for active ownership groups
-- This prevents multiple ownership groups from existing on the same unit
-- Only indexes non-dissolved groups (dissolvedAt IS NULL)
CREATE UNIQUE INDEX "uq_unit_active_ownership_group"
  ON "ResidencyGroup"("unitId", "groupType")
  WHERE "dissolvedAt" IS NULL AND "groupType" = 'OWNERSHIP';
