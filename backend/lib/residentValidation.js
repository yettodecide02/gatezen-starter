export class ResidentValidationError extends Error {
  constructor(message, statusCode, code, meta = {}) {
    super(message);
    this.name = "ResidentValidationError";
    this.statusCode = statusCode;
    this.code = code;
    this.meta = meta;
  }
}

function activeResidentWhere() {
  return {
    role: "RESIDENT",
    status: "APPROVED",
  };
}

export async function validateResidentCreation(
  tx,
  { unitId, communityId, residentSubtype, residencyGroupId },
) {
  const unit = await tx.unit.findFirst({
    where: { id: unitId, communityId },
    select: { id: true, maxResidents: true },
  });

  if (!unit) {
    throw new ResidentValidationError("Unit not found", 404, "UNIT_NOT_FOUND");
  }

  const slotsUsed = await tx.user.count({
    where: {
      unitId,
      communityId,
      ...activeResidentWhere(),
      residentStatus: { not: "INACTIVE" },
    },
  });

  if (slotsUsed >= unit.maxResidents) {
    throw new ResidentValidationError(
      "Unit is at resident capacity",
      409,
      "UNIT_AT_CAPACITY",
      { slotsUsed, slotsTotal: unit.maxResidents, slotsRemaining: 0 },
    );
  }

  let ownershipGroup = null;
  let resolvedResidencyGroupId = residencyGroupId || null;

  if (residentSubtype === "OWNER") {
    ownershipGroup = await tx.residencyGroup.findFirst({
      where: {
        unitId,
        communityId,
        groupType: "OWNERSHIP",
        dissolvedAt: null,
      },
      select: { id: true },
    });

    if (ownershipGroup) {
      if (
        resolvedResidencyGroupId &&
        resolvedResidencyGroupId !== ownershipGroup.id
      ) {
        throw new ResidentValidationError(
          "Unit already has an ownership group. You cannot create a new one.",
          409,
          "OWNERSHIP_GROUP_CONFLICT",
          { existingGroupId: ownershipGroup.id },
        );
      }

      resolvedResidencyGroupId = ownershipGroup.id;
    }
  }

  return {
    unit,
    slotsUsed,
    slotsTotal: unit.maxResidents,
    slotsRemaining: unit.maxResidents - slotsUsed,
    ownershipGroup,
    residencyGroupId: resolvedResidencyGroupId,
  };
}

export function validateTenantFields({ leaseStartDate, leaseEndDate }) {
  if (!leaseStartDate || !leaseEndDate) {
    throw new ResidentValidationError(
      "Tenants must have leaseStartDate and leaseEndDate",
      400,
      "TENANT_REQUIRES_LEASE_DATES",
    );
  }

  if (new Date(leaseEndDate) <= new Date(leaseStartDate)) {
    throw new ResidentValidationError(
      "leaseEndDate must be after leaseStartDate",
      400,
      "INVALID_LEASE_DATES",
    );
  }
}

export async function validateMinorGuardian(
  tx,
  { isMinor, guardianId, unitId, communityId },
) {
  if (!isMinor) {
    return;
  }

  if (!guardianId) {
    throw new ResidentValidationError(
      "A minor resident must have a guardianId",
      400,
      "MINOR_REQUIRES_GUARDIAN",
    );
  }

  const guardian = await tx.user.findFirst({
    where: {
      id: guardianId,
      unitId,
      communityId,
      ...activeResidentWhere(),
      isMinor: false,
    },
    select: { id: true },
  });

  if (!guardian) {
    throw new ResidentValidationError(
      "Guardian must be an active, non-minor resident of the same unit",
      400,
      "INVALID_GUARDIAN",
    );
  }
}
