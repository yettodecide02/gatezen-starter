import prisma from "../../lib/prisma.js";

// In-memory cache: communityId → { features: string[], expiresAt: number }
const cache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

async function getCommunityFeatures(communityId) {
  const now = Date.now();
  const cached = cache.get(communityId);
  if (cached && cached.expiresAt > now) {
    return cached.features;
  }

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { plan: { select: { features: true } } },
  });

  const features = community?.plan?.features ?? [];
  cache.set(communityId, { features, expiresAt: now + CACHE_TTL_MS });
  return features;
}

/**
 * Invalidate the cache for a community (call this when plan changes).
 */
export function invalidateCommunityPlanCache(communityId) {
  cache.delete(communityId);
}

/**
 * Middleware factory. Usage: router.get("/route", checkFeature("FEATURE_KEY"), handler)
 * If requiredFeature is null/undefined the middleware is a no-op (open route).
 */
export function checkFeature(requiredFeature) {
  return async (req, res, next) => {
    if (!requiredFeature) return next();

    const communityId = req.user?.communityId;
    if (!communityId) {
      return res
        .status(403)
        .json({ error: "No community associated with this account" });
    }

    try {
      const features = await getCommunityFeatures(communityId);

      if (!features.includes(requiredFeature)) {
        return res.status(403).json({
          error: "This feature is not available on your current plan",
          feature: requiredFeature,
        });
      }

      next();
    } catch (e) {
      console.error("checkFeature error:", e);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}
