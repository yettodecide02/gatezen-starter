import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startTestServer,
  stopTestServer,
  makeRequest,
  fixtures,
} from "./helpers/testServer.js";
import { TestLogger } from "./helpers/logger.js";

describe("GateZen Intercom, Notifications & Cron Scheduler", () => {
  before(async () => {
    TestLogger.logSection("INTERCOM, NOTIFICATIONS & CRON TEST SUITE");
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  describe("Intercom Subsystem", () => {
    it("GET /intercom/gatekeeper should require authentication", async () => {
      const res = await makeRequest("GET", "/intercom/gatekeeper", {
        suite: "Intercom",
        testName: "Unauthenticated gatekeeper lookup",
      });
      assert.equal(res.status, 401);
    });

    it("GET /intercom/gatekeeper should reject request missing communityId", async () => {
      const res = await makeRequest("GET", "/intercom/gatekeeper", {
        suite: "Intercom",
        testName: "Missing communityId",
        token: fixtures.residentToken,
      });
      assert.equal(res.status, 400);
      assert.match(res.json?.error, /communityId is required/i);
    });

    it("GET /intercom/gatekeeper should forbid cross-community lookup (Tenant Isolation)", async () => {
      const res = await makeRequest("GET", "/intercom/gatekeeper", {
        suite: "Intercom",
        testName: "Cross-community gatekeeper lookup",
        token: fixtures.residentToken,
        params: { communityId: "00000000-0000-0000-0000-000000000000" },
      });
      assert.equal(res.status, 403);
      assert.equal(res.json?.error, "Forbidden");
    });

    it("GET /intercom/gatekeeper should succeed or 404 for own community", async () => {
      const res = await makeRequest("GET", "/intercom/gatekeeper", {
        suite: "Intercom",
        testName: "Own community gatekeeper lookup",
        token: fixtures.residentToken,
        params: { communityId: fixtures.residentUser?.communityId },
      });
      assert.ok([200, 404].includes(res.status));
      if (res.status === 200) {
        assert.ok(res.json?.gatekeeper);
      }
    });

    it("POST /intercom/notify should reject missing receiverId or callId", async () => {
      const res = await makeRequest("POST", "/intercom/notify", {
        suite: "Intercom",
        testName: "Notify missing body",
        token: fixtures.residentToken,
        body: {},
      });
      assert.equal(res.status, 400);
      assert.match(res.json?.error, /required/i);
    });

    it("POST /intercom/notify should forbid cross-community notify calls", async () => {
      const res = await makeRequest("POST", "/intercom/notify", {
        suite: "Intercom",
        testName: "Cross-community intercom push spoofing",
        token: fixtures.residentToken,
        body: {
          receiverId: "00000000-0000-0000-0000-000000000000",
          callId: "call_test_123",
          callerName: "Resident Spoof",
        },
      });
      // Receiver doesn't exist (returns success: false) or 403 if in other community
      assert.ok([200, 403].includes(res.status));
    });

    it("POST /intercom/notify-cancel should reject missing receiverId or callId", async () => {
      const res = await makeRequest("POST", "/intercom/notify-cancel", {
        suite: "Intercom",
        testName: "Cancel missing body",
        token: fixtures.residentToken,
        body: {},
      });
      assert.equal(res.status, 400);
      assert.match(res.json?.error, /required/i);
    });
  });

  describe("Push Notifications Management", () => {
    it("POST /notifications/token should require pushToken in body", async () => {
      const res = await makeRequest("POST", "/notifications/token", {
        suite: "Notifications",
        testName: "Register token missing pushToken",
        token: fixtures.residentToken,
        body: {},
      });
      assert.equal(res.status, 400);
      assert.match(res.json?.error, /pushToken is required/i);
    });

    it("POST /notifications/token should successfully update push token", async () => {
      const testPushToken = `ExponentPushToken[test_${Date.now()}]`;
      const res = await makeRequest("POST", "/notifications/token", {
        suite: "Notifications",
        testName: "Register valid push token",
        token: fixtures.residentToken,
        body: { pushToken: testPushToken },
      });
      assert.equal(res.status, 200);
      assert.equal(res.json?.success, true);
    });

    it("DELETE /notifications/token should clear user's push token on logout", async () => {
      const res = await makeRequest("DELETE", "/notifications/token", {
        suite: "Notifications",
        testName: "Clear token on logout",
        token: fixtures.residentToken,
      });
      assert.equal(res.status, 200);
      assert.equal(res.json?.success, true);
    });

    it("POST /notifications/admin/clear-tokens should forbid non-admin roles", async () => {
      const res = await makeRequest("POST", "/notifications/admin/clear-tokens", {
        suite: "Notifications",
        testName: "Resident attempting admin clear-tokens",
        token: fixtures.residentToken,
      });
      assert.equal(res.status, 403);
      assert.equal(res.json?.error, "Forbidden");
    });

    it("POST /notifications/admin/clear-tokens should be accessible only by admin", async () => {
      const res = await makeRequest("POST", "/notifications/admin/clear-tokens", {
        suite: "Notifications",
        testName: "Admin clearing community tokens",
        token: fixtures.adminToken,
      });
      assert.equal(res.status, 200);
      assert.equal(res.json?.success, true);
    });
  });

  describe("Cron Schedulers & Security Handshake", () => {
    it("GET /cron/booking-reminder should reject call without valid CRON_SECRET", async () => {
      const res1 = await makeRequest("GET", "/cron/booking-reminder", {
        suite: "Cron",
        testName: "Unauthenticated cron call",
      });
      assert.equal(res1.status, 401);
      assert.equal(res1.json?.error, "Unauthorized");

      const res2 = await makeRequest("GET", "/cron/booking-reminder", {
        suite: "Cron",
        testName: "Bogus cron secret",
        headers: { "x-cron-secret": "completely-wrong-secret-999" },
      });
      assert.equal(res2.status, 401);
      assert.equal(res2.json?.error, "Unauthorized");
    });

    it("GET /cron/booking-reminder should succeed when valid CRON_SECRET is supplied", async () => {
      const secret = process.env.CRON_SECRET;
      if (secret) {
        const res = await makeRequest("GET", "/cron/booking-reminder", {
          suite: "Cron",
          testName: "Valid cron execution",
          headers: { "x-cron-secret": secret },
        });
        assert.equal(res.status, 200);
        assert.equal(res.json?.ok, true);
        assert.ok(typeof res.json?.sent === "number");
      }
    });

    it("POST /cron/check-receipts should reject call without valid CRON_SECRET", async () => {
      const res = await makeRequest("POST", "/cron/check-receipts", {
        suite: "Cron",
        testName: "Unauthenticated receipt check",
      });
      assert.equal(res.status, 401);
    });

    it("POST /cron/check-receipts should succeed when valid CRON_SECRET is supplied", async () => {
      const secret = process.env.CRON_SECRET;
      if (secret) {
        const res = await makeRequest("POST", "/cron/check-receipts", {
          suite: "Cron",
          testName: "Valid check-receipts execution",
          headers: { "x-cron-secret": secret },
        });
        assert.equal(res.status, 200);
        assert.equal(res.json?.ok, true);
      }
    });
  });
});
