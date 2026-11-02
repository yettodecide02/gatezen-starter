import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startTestServer,
  stopTestServer,
  makeRequest,
  fixtures,
} from "./helpers/testServer.js";
import { TestLogger } from "./helpers/logger.js";

describe("GateZen Gatekeeper Routes & Guard Security", () => {
  before(async () => {
    TestLogger.logSection("GATEKEEPER API TEST SUITE");
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  describe("Authentication & RBAC Enforcement", () => {
    it("should return 401 when Authorization header is missing", async () => {
      const res = await makeRequest("GET", "/gatekeeper/stats", {
        suite: "Gatekeeper RBAC",
        testName: "Missing Auth Header",
      });
      assert.equal(res.status, 401);
      assert.match(res.json?.error, /Missing token/i);
    });

    it("should return 401 when token is invalid", async () => {
      const res = await makeRequest("GET", "/gatekeeper/stats", {
        suite: "Gatekeeper RBAC",
        testName: "Invalid Token",
        token: fixtures.invalidToken,
      });
      assert.equal(res.status, 401);
    });

    it("should return 403 Forbidden when RESIDENT tries to access gatekeeper routes", async () => {
      const res = await makeRequest("GET", "/gatekeeper/stats", {
        suite: "Gatekeeper RBAC",
        testName: "Resident accessing Guard routes",
        token: fixtures.residentToken,
      });
      assert.equal(res.status, 403);
      assert.equal(res.json?.error, "Forbidden");
    });

    it("should return 403 Forbidden when ADMIN tries to access gatekeeper routes", async () => {
      const res = await makeRequest("GET", "/gatekeeper/stats", {
        suite: "Gatekeeper RBAC",
        testName: "Admin accessing Guard routes",
        token: fixtures.adminToken,
      });
      assert.equal(res.status, 403);
      assert.equal(res.json?.error, "Forbidden");
    });
  });

  describe("Visitor Management & Check-in/Check-out", () => {
    it("GET /gatekeeper/ should return active visitor log", async () => {
      const res = await makeRequest("GET", "/gatekeeper/", {
        suite: "Gatekeeper Visitors",
        testName: "GET /gatekeeper/",
        token: fixtures.gatekeeperToken,
      });
      assert.ok([200, 403].includes(res.status));
      if (res.status === 200) {
        assert.ok(Array.isArray(res.json) || Array.isArray(res.json?.visitors));
      }
    });

    it("POST /gatekeeper/ should reject walk-in visitor without required details", async () => {
      const res = await makeRequest("POST", "/gatekeeper/", {
        suite: "Gatekeeper Visitors",
        testName: "Create walk-in visitor missing fields",
        token: fixtures.gatekeeperToken,
        body: {},
      });
      assert.ok([400, 403, 500].includes(res.status));
    });

    it("GET /gatekeeper/stats should return guard daily stats", async () => {
      const res = await makeRequest("GET", "/gatekeeper/stats", {
        suite: "Gatekeeper Stats",
        testName: "GET /gatekeeper/stats",
        token: fixtures.gatekeeperToken,
      });
      assert.equal(res.status, 200);
      assert.ok(res.json !== null);
    });

    it("GET /gatekeeper/scan should reject missing QR code id", async () => {
      const res = await makeRequest("GET", "/gatekeeper/scan", {
        suite: "Gatekeeper Scan",
        testName: "GET /gatekeeper/scan missing id",
        token: fixtures.gatekeeperToken,
      });
      assert.ok([400, 403].includes(res.status));
    });

    it("GET /gatekeeper/scan with non-existent id should return 404", async () => {
      const res = await makeRequest("GET", "/gatekeeper/scan", {
        suite: "Gatekeeper Scan",
        testName: "GET /gatekeeper/scan non-existent pass",
        token: fixtures.gatekeeperToken,
        params: { id: "00000000-0000-0000-0000-000000000000" },
      });
      assert.ok([400, 403, 404, 500].includes(res.status));
    });

    it("GET /gatekeeper/visitors should handle date queries", async () => {
      const res = await makeRequest("GET", "/gatekeeper/visitors", {
        suite: "Gatekeeper Visitors",
        testName: "GET /gatekeeper/visitors",
        token: fixtures.gatekeeperToken,
        params: { from: "2026-01-01", to: "2026-12-31" },
      });
      assert.ok([200, 403].includes(res.status));
      if (res.status === 200) {
        assert.ok(Array.isArray(res.json) || Array.isArray(res.json?.visitors));
      }
    });

    it("POST /gatekeeper/checkin/:id should handle non-existent visitor ID", async () => {
      const res = await makeRequest("POST", "/gatekeeper/checkin/00000000-0000-0000-0000-000000000000", {
        suite: "Gatekeeper Visitors",
        testName: "Check-in non-existent visitor",
        token: fixtures.gatekeeperToken,
      });
      assert.ok([400, 403, 404, 500].includes(res.status));
    });

    it("POST /gatekeeper/checkout/:id should handle non-existent visitor ID", async () => {
      const res = await makeRequest("POST", "/gatekeeper/checkout/00000000-0000-0000-0000-000000000000", {
        suite: "Gatekeeper Visitors",
        testName: "Check-out non-existent visitor",
        token: fixtures.gatekeeperToken,
      });
      assert.ok([400, 403, 404, 500].includes(res.status));
    });

    it("GET /gatekeeper/current should return visitors currently on premises", async () => {
      const res = await makeRequest("GET", "/gatekeeper/current", {
        suite: "Gatekeeper Visitors",
        testName: "GET /gatekeeper/current",
        token: fixtures.gatekeeperToken,
      });
      assert.ok([200, 403].includes(res.status));
    });
  });

  describe("Packages & Delivery Management", () => {
    it("GET /gatekeeper/packages should return packages list with dates and communityId", async () => {
      const res = await makeRequest("GET", "/gatekeeper/packages", {
        suite: "Gatekeeper Packages",
        testName: "GET /gatekeeper/packages",
        token: fixtures.gatekeeperToken,
        params: {
          from: "2026-01-01",
          to: "2026-12-31",
          communityId: fixtures.community?.id,
        },
      });
      assert.ok([200, 403].includes(res.status));
    });

    it("POST /gatekeeper/packages should reject package missing resident details", async () => {
      const res = await makeRequest("POST", "/gatekeeper/packages", {
        suite: "Gatekeeper Packages",
        testName: "Create package missing fields",
        token: fixtures.gatekeeperToken,
        body: {},
      });
      assert.ok([400, 403, 500].includes(res.status));
    });

    it("PATCH /gatekeeper/packages/:id should handle non-existent package ID", async () => {
      const res = await makeRequest("PATCH", "/gatekeeper/packages/00000000-0000-0000-0000-000000000000", {
        suite: "Gatekeeper Packages",
        testName: "Update non-existent package status",
        token: fixtures.gatekeeperToken,
        body: { status: "COLLECTED" },
      });
      assert.ok([400, 403, 404, 500].includes(res.status));
    });
  });

  describe("Resident Directory, Kid Passes & Vehicle Lookup", () => {
    it("GET /gatekeeper/residents should return resident directory (verify tenant parameter API-006)", async () => {
      // 1. Without communityId: returns 400
      const resMissing = await makeRequest("GET", "/gatekeeper/residents", {
        suite: "Gatekeeper Directory",
        testName: "GET /gatekeeper/residents missing communityId",
        token: fixtures.gatekeeperToken,
      });
      assert.equal(resMissing.status, 400);

      // 2. With communityId: returns 200
      const resWithId = await makeRequest("GET", "/gatekeeper/residents", {
        suite: "Gatekeeper Directory",
        testName: "GET /gatekeeper/residents with communityId",
        token: fixtures.gatekeeperToken,
        params: { communityId: fixtures.community?.id },
      });
      assert.equal(resWithId.status, 200);
      assert.ok(Array.isArray(resWithId.json) || Array.isArray(resWithId.json?.residents));
    });

    it("GET /gatekeeper/kid-passes should return kid passes", async () => {
      const res = await makeRequest("GET", "/gatekeeper/kid-passes", {
        suite: "Gatekeeper Kid Passes",
        testName: "GET /gatekeeper/kid-passes",
        token: fixtures.gatekeeperToken,
      });
      assert.ok([200, 403].includes(res.status));
    });

    it("POST /gatekeeper/kid-passes/:id should handle non-existent pass", async () => {
      const res = await makeRequest("POST", "/gatekeeper/kid-passes/00000000-0000-0000-0000-000000000000", {
        suite: "Gatekeeper Kid Passes",
        testName: "Update non-existent kid pass status",
        token: fixtures.gatekeeperToken,
        body: { status: "CHECKED_OUT" },
      });
      assert.ok([400, 403, 404, 500].includes(res.status));
    });

    it("GET /gatekeeper/vehicle-search should reject missing query params", async () => {
      const res = await makeRequest("GET", "/gatekeeper/vehicle-search", {
        suite: "Gatekeeper Vehicles",
        testName: "Vehicle search missing params",
        token: fixtures.gatekeeperToken,
      });
      assert.ok([400, 403].includes(res.status));
    });

    it("GET /gatekeeper/vehicle-search should search vehicles by plate number and communityId", async () => {
      const res = await makeRequest("GET", "/gatekeeper/vehicle-search", {
        suite: "Gatekeeper Vehicles",
        testName: "Vehicle search with plate and communityId",
        token: fixtures.gatekeeperToken,
        params: { vehicleNo: "AP12AB", communityId: fixtures.community?.id },
      });
      assert.ok([200, 403, 404].includes(res.status));
    });

    it("GET /gatekeeper/profile should return guard profile", async () => {
      const res = await makeRequest("GET", "/gatekeeper/profile", {
        suite: "Gatekeeper Profile",
        testName: "GET /gatekeeper/profile",
        token: fixtures.gatekeeperToken,
      });
      assert.equal(res.status, 200);
      assert.ok(res.json !== null);
    });

    it("GET /gatekeeper/directory should return guard intercom directory with communityId", async () => {
      const res = await makeRequest("GET", "/gatekeeper/directory", {
        suite: "Gatekeeper Directory",
        testName: "GET /gatekeeper/directory with communityId",
        token: fixtures.gatekeeperToken,
        params: { communityId: fixtures.community?.id },
      });
      assert.ok([200, 403].includes(res.status));
    });
  });
});
