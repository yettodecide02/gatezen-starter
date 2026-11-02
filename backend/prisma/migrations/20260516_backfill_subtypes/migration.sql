-- Phase 2: Backfill existing RESIDENT users into residency groups
-- This migration creates ownership groups for all units that have residents
-- and assigns all RESIDENT users to their respective groups

-- Step 1: Set all existing RESIDENT-role users to OWNER subtype (if not already set)
-- Assumption: all current residents are unit owners
UPDATE "User"
SET "residentSubtype" = 'OWNER',
    "residentStatus"  = 'ACTIVE'
WHERE "role" = 'RESIDENT'
  AND "residentSubtype" IS NULL
  AND "unitId" IS NOT NULL;

-- Step 2: Create one OWNERSHIP group per unit that has residents
-- This uses a CTE to avoid duplicate groups per unit
WITH units_with_residents AS (
  SELECT DISTINCT "unitId", "communityId"
  FROM "User"
  WHERE "role" = 'RESIDENT'
    AND "unitId" IS NOT NULL
    AND "residentSubtype" = 'OWNER'
    AND "communityId" IS NOT NULL
)
INSERT INTO "ResidencyGroup" ("id", "communityId", "unitId", "groupType", "createdAt")
SELECT
  gen_random_uuid()::text,
  uwr."communityId",
  uwr."unitId",
  'OWNERSHIP'::"GroupType",
  NOW()
FROM units_with_residents uwr
ON CONFLICT DO NOTHING;

-- Step 3: Link existing OWNER users to their unit's ownership group
UPDATE "User" u
SET "residencyGroupId" = rg."id"
FROM "ResidencyGroup" rg
WHERE rg."unitId" = u."unitId"
  AND rg."communityId" = u."communityId"
  AND rg."groupType" = 'OWNERSHIP'
  AND u."role" = 'RESIDENT'
  AND u."residentSubtype" = 'OWNER'
  AND u."residencyGroupId" IS NULL;

-- Step 4: Set the earliest-created owner per unit as the primary contact
WITH first_owners AS (
  SELECT DISTINCT ON ("unitId") "id"
  FROM "User"
  WHERE "residentSubtype" = 'OWNER'
    AND "residentStatus" = 'ACTIVE'
    AND "unitId" IS NOT NULL
  ORDER BY "unitId", "createdAt" ASC
)
UPDATE "User"
SET "isPrimaryContact" = TRUE
WHERE "id" IN (SELECT "id" FROM first_owners)
  AND "isPrimaryContact" = FALSE;

-- Step 5: Set primaryResidentId on each group to the primary contact
UPDATE "ResidencyGroup" rg
SET "primaryResidentId" = (
  SELECT u."id"
  FROM "User" u
  WHERE u."residencyGroupId" = rg."id"
    AND u."isPrimaryContact" = TRUE
  LIMIT 1
)
WHERE rg."groupType" = 'OWNERSHIP'
  AND rg."primaryResidentId" IS NULL;
