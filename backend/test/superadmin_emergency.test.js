import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startTestServer,
  stopTestServer,
  makeRequest,
  fixtures,
} from "./helpers/testServer.js";
import { TestLogger } from "./helpers/logger.js";

describe("GateZen SuperAdmin & Emergency Services", () => {
  before(async () => {
    TestLogger.logSection("SUPERADMIN & EMERGENCY TEST SUITE");
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  describe("SuperAdmin Bootstrap & Authentication", () => {
    it("POST /superadmin/auth/register should reject without x-setup-secret header", async () => {
      const res = await makeRequest("POST", "/superadmin/auth/register", {
        suite: "SuperAdmin Auth",
        testName: "Missing setup secret header",
        body: {
          name: "Attacker",
          email: "attacker@exploit.com",
          password: "password123",
        },
      });
      assert.equal(res.status, 403);
      assert.equal(res.json?.error, "Forbidden");
    });

    it("POST /superadmin/auth/register should reject wrong x-setup-secret header", async () => {
      const res = await makeRequest("POST", "/superadmin/auth/register", {
        suite: "SuperAdmin Auth",
        testName: "Invalid setup secret header",
        headers: { "x-setup-secret": "wrong-secret-999" },
        body: {
          name: "Attacker",
          email: "attacker@exploit.com",
          password: "password123",
        },
      });
      assert.equal(res.status, 403);
    });

    it("POST /superadmin/auth/register should validate required fields with valid secret", async () => {
      const secret = process.env.SUPERADMIN_SETUP_SECRET;
      if (secret) {
        const res = await makeRequest("POST", "/superadmin/auth/register", {
          suite: "SuperAdmin Auth",
          testName: "Register missing fields",
          headers: { "x-setup-secret": secret },
          body: { name: "Incomplete Admin" },
        });
        assert.equal(res.status, 400);
        assert.match(res.json?.error, /required/i);
      }
    });

    it("POST /superadmin/auth/login should reject empty credentials", async () => {
      const res = await makeRequest("POST", "/superadmin/auth/login", {
        suite: "SuperAdmin Auth",
        testName: "Empty login body",
        body: {},
      });
      assert.equal(res.status, 400);
      assert.match(res.json?.error, /required/i);
    });

    it("POST /superadmin/auth/login should reject invalid credentials", async () => {
      const res = await makeRequest("POST", "/superadmin/auth/login", {
        suite: "SuperAdmin Auth",
        testName: "Invalid login credentials",
        body: {
          email: "nonexistent-superadmin@domain.com",
          password: "wrong-password",
        },
      });
      assert.equal(res.status, 401);
      assert.equal(res.json?.error, "Invalid email or password");
    });
  });

  describe("SuperAdmin Platform Operations", () => {
    it("GET /superadmin/auth/me should reject non-superadmin users", async () => {
      // 1. Unauthenticated -> 401
      const resAnon = await makeRequest("GET", "/superadmin/auth/me", {
        suite: "SuperAdmin Platform",
        testName: "Anonymous GET /auth/me",
      });
      assert.equal(resAnon.status, 401);

      // 2. Regular Admin token -> 403 Forbidden (not a super admin)
      const resAdmin = await makeRequest("GET", "/superadmin/auth/me", {
        suite: "SuperAdmin Platform",
        testName: "Community Admin attempting SuperAdmin /auth/me",
        token: fixtures.adminToken,
      });
      assert.equal(resAdmin.status, 403);
      assert.match(resAdmin.json?.error, /not a super admin/i);
    });

    it("GET /superadmin/auth/me should succeed for verified SuperAdmin", async () => {
      if (fixtures.superAdminToken) {
        const res = await makeRequest("GET", "/superadmin/auth/me", {
          suite: "SuperAdmin Platform",
          testName: "SuperAdmin /auth/me profile",
          token: fixtures.superAdminToken,
        });
        assert.equal(res.status, 200);
        assert.equal(res.json?.id, fixtures.superAdminUser?.id);
      }
    });

    it("GET /superadmin/location-counts should return geolocation stats", async () => {
      if (fixtures.superAdminToken) {
        const res = await makeRequest("GET", "/superadmin/location-counts", {
          suite: "SuperAdmin Platform",
          testName: "GET /superadmin/location-counts",
          token: fixtures.superAdminToken,
        });
        assert.equal(res.status, 200);
        assert.ok(typeof res.json === "object");
      }
    });

    it("GET /superadmin/plans should return plan list", async () => {
      if (fixtures.superAdminToken) {
        const res = await makeRequest("GET", "/superadmin/plans", {
          suite: "SuperAdmin Platform",
          testName: "GET /superadmin/plans",
          token: fixtures.superAdminToken,
        });
        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.json) || Array.isArray(res.json?.plans));
      }
    });

    it("POST /superadmin/plans should reject invalid plan creation payload", async () => {
      if (fixtures.superAdminToken) {
        const res = await makeRequest("POST", "/superadmin/plans", {
          suite: "SuperAdmin Platform",
          testName: "Create plan missing fields",
          token: fixtures.superAdminToken,
          body: {},
        });
        assert.equal(res.status, 400);
      }
    });

    it("PUT /superadmin/plans/:id should handle non-existent plan ID", async () => {
      if (fixtures.superAdminToken) {
        const res = await makeRequest("PUT", "/superadmin/plans/00000000-0000-0000-0000-000000000000", {
          suite: "SuperAdmin Platform",
          testName: "Update non-existent plan",
          token: fixtures.superAdminToken,
          body: { description: "Updated" },
        });
        assert.ok([400, 404, 500].includes(res.status));
      }
    });

    it("DELETE /superadmin/plans/:id should handle non-existent plan ID", async () => {
      if (fixtures.superAdminToken) {
        const res = await makeRequest("DELETE", "/superadmin/plans/00000000-0000-0000-0000-000000000000", {
          suite: "SuperAdmin Platform",
          testName: "Delete non-existent plan",
          token: fixtures.superAdminToken,
        });
        assert.ok([400, 404, 500].includes(res.status));
      }
    });

    it("GET /superadmin/communities should return managed communities", async () => {
      if (fixtures.superAdminToken) {
        const res = await makeRequest("GET", "/superadmin/communities", {
          suite: "SuperAdmin Platform",
          testName: "GET /superadmin/communities",
          token: fixtures.superAdminToken,
        });
        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.json) || Array.isArray(res.json?.communities));
      }
    });

    it("PUT /superadmin/communities/:id/plan should reject non-existent planId with 404", async () => {
      if (fixtures.superAdminToken && fixtures.community?.id) {
        const res = await makeRequest("PUT", `/superadmin/communities/${fixtures.community.id}/plan`, {
          suite: "SuperAdmin Platform",
          testName: "Assign non-existent planId",
          token: fixtures.superAdminToken,
          body: { planId: "00000000-0000-0000-0000-000000000000" },
        });
        assert.equal(res.status, 404);
        assert.equal(res.json?.error, "Plan not found");
      }
    });
  });

  describe("Emergency SOS & Distress Services", () => {
    it("POST /emergency/sos should require user authentication", async () => {
      const res = await makeRequest("POST", "/emergency/sos", {
        suite: "Emergency",
        testName: "Unauthenticated SOS call",
      });
      assert.equal(res.status, 401);
    });

    it("POST /emergency/sos should create active emergency alert", async () => {
      const res = await makeRequest("POST", "/emergency/sos", {
        suite: "Emergency",
        testName: "Dispatch Emergency SOS",
        token: fixtures.residentToken,
        body: { message: "Test medical emergency alert - please disregard" },
      });
      assert.equal(res.status, 201);
      assert.equal(res.json?.success, true);
      assert.ok(res.json?.alert?.id || res.json?.alertId);
    });

    it("GET /emergency/alerts should return community emergency alerts", async () => {
      const res = await makeRequest("GET", "/emergency/alerts", {
        suite: "Emergency",
        testName: "GET /emergency/alerts",
        token: fixtures.residentToken,
      });
      assert.equal(res.status, 200);
      assert.equal(res.json?.success, true);
      assert.ok(Array.isArray(res.json?.alerts));
    });

    it("PATCH /emergency/alerts/:id/cancel should handle non-existent alert ID", async () => {
      const res = await makeRequest("PATCH", "/emergency/alerts/00000000-0000-0000-0000-000000000000/cancel", {
        suite: "Emergency",
        testName: "Cancel non-existent emergency alert",
        token: fixtures.residentToken,
      });
      assert.equal(res.status, 404);
      assert.match(res.json?.error, /not found/i);
    });
  });
});
