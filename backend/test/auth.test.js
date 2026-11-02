import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startTestServer,
  stopTestServer,
  makeRequest,
  fixtures,
} from "./helpers/testServer.js";
import { TestLogger } from "./helpers/logger.js";

describe("GateZen Authentication & Public Routes", () => {
  before(async () => {
    TestLogger.logSection("AUTH & PUBLIC ROUTES TEST SUITE");
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  describe("Server Root & Healthcheck", () => {
    it("GET / should return 200 with welcome message", async () => {
      const res = await makeRequest("GET", "/", {
        suite: "Auth",
        testName: "GET / Healthcheck",
      });
      assert.equal(res.status, 200);
      assert.match(res.rawText, /Welcome to the GateZen backend/i);
    });

    it("GET /non-existent-route should return 404 JSON fallback", async () => {
      const res = await makeRequest("GET", "/random-404-check", {
        suite: "Auth",
        testName: "GET 404 Fallback",
      });
      assert.equal(res.status, 404);
      assert.equal(res.json?.error, "Route not found");
    });
  });

  describe("POST /auth/login", () => {
    it("should reject login when email or password is missing", async () => {
      const res1 = await makeRequest("POST", "/auth/login", {
        suite: "Auth",
        testName: "Missing password",
        body: { email: "test@example.com" },
      });
      assert.equal(res1.status, 400);
      assert.match(res1.json?.error, /required/i);

      const res2 = await makeRequest("POST", "/auth/login", {
        suite: "Auth",
        testName: "Missing email",
        body: { password: "some-password" },
      });
      assert.equal(res2.status, 400);
      assert.match(res2.json?.error, /required/i);
    });

    it("should return 401 for invalid credentials", async () => {
      const res = await makeRequest("POST", "/auth/login", {
        suite: "Auth",
        testName: "Invalid credentials",
        body: {
          email: "nonexistent-user-12345@domain.com",
          password: "wrong-password-999",
        },
      });
      assert.equal(res.status, 401);
      assert.equal(res.json?.error, "Invalid email or password");
    });

    it("should handle SQL injection vectors in login gracefully", async () => {
      const vectors = [
        "' OR '1'='1",
        "admin' --",
        "admin' /*",
        "' UNION SELECT * FROM \"User\" --",
      ];

      for (const vector of vectors) {
        const res = await makeRequest("POST", "/auth/login", {
          suite: "Auth",
          testName: `SQLi Test: ${vector}`,
          body: {
            email: vector,
            password: "password123",
          },
        });
        assert.ok([400, 401].includes(res.status), `Expected 400 or 401 for SQLi, got ${res.status}`);
      }
    });

    it("should handle non-string / malformed payload types in login without crashing", async () => {
      const res = await makeRequest("POST", "/auth/login", {
        suite: "Auth",
        testName: "Object and array inputs",
        body: {
          email: { "$gt": "" },
          password: [1, 2, 3],
        },
      });
      assert.ok([400, 401, 500].includes(res.status));
    });
  });

  describe("POST /auth/community-signup", () => {
    it("should return 400 when required fields are missing", async () => {
      const res = await makeRequest("POST", "/auth/community-signup", {
        suite: "Auth",
        testName: "Community signup missing required fields",
        body: {
          communityName: "New Test Community",
        },
      });
      assert.equal(res.status, 400);
      assert.match(res.json?.error, /required/i);
    });

    it("should reject signup when community name already exists", async () => {
      if (fixtures.community?.name) {
        const res = await makeRequest("POST", "/auth/community-signup", {
          suite: "Auth",
          testName: "Community signup duplicate name",
          body: {
            name: "Duplicate Admin",
            email: `admin_${Date.now()}@test.com`,
            password: "SecurePassword123!",
            communityName: fixtures.community.name,
          },
        });
        assert.equal(res.status, 400);
        assert.match(res.json?.error, /Community with this name exists/i);
      }
    });
  });

  describe("POST /auth/signup (Resident Signup)", () => {
    it("should return 400 when resident signup is missing required fields", async () => {
      const res = await makeRequest("POST", "/auth/signup", {
        suite: "Auth",
        testName: "Resident signup missing fields",
        body: {
          name: "John Doe",
        },
      });
      assert.equal(res.status, 400);
      assert.match(res.json?.error, /required/i);
    });

    it("should reject resident signup with invalid password length", async () => {
      const res = await makeRequest("POST", "/auth/signup", {
        suite: "Auth",
        testName: "Resident signup short password",
        body: {
          name: "Resident One",
          email: `res_${Date.now()}@example.com`,
          password: "short",
          phone: "9998887771",
          communityId: "nonexistent-id",
          unitId: "nonexistent-id",
          residentType: "RESIDENT",
          residentSubtype: "OWNER",
        },
      });
      assert.equal(res.status, 400);
    });
  });

  describe("GET /auth/existing-user (User Enumeration Endpoint)", () => {
    it("should return exists: false when email is missing or not found", async () => {
      const res1 = await makeRequest("GET", "/auth/existing-user", {
        suite: "Auth",
        testName: "Missing email parameter",
      });
      assert.equal(res1.status, 200);
      assert.equal(res1.json?.exists, false);

      const res2 = await makeRequest("GET", "/auth/existing-user", {
        suite: "Auth",
        testName: "Non-existent user email",
        params: { email: "completely-nonexistent-user-999@test.com" },
      });
      assert.equal(res2.status, 200);
      assert.equal(res2.json?.exists, false);
    });

    it("should return exists: true for valid existing registered user", async () => {
      if (fixtures.residentUser?.email) {
        const res = await makeRequest("GET", "/auth/existing-user", {
          suite: "Auth",
          testName: "Existing user probe",
          params: { email: fixtures.residentUser.email },
        });

        assert.equal(res.status, 200);
        assert.equal(res.json?.exists, true);
      }
    });
  });

  describe("OTP & Password Reset Endpoints", () => {
    it("POST /auth/send-otp should reject empty request", async () => {
      const res = await makeRequest("POST", "/auth/send-otp", {
        suite: "Auth",
        testName: "Send OTP empty body",
        body: {},
      });
      assert.equal(res.status, 400);
      assert.equal(res.json?.success, false);
      assert.match(res.json?.message, /required/i);
    });

    it("POST /auth/check-otp should reject when no OTP requested yet", async () => {
      const res = await makeRequest("POST", "/auth/check-otp", {
        suite: "Auth",
        testName: "Check OTP with unrequested email",
        body: { email: "unrequested@example.com", otp: "123456" },
      });
      assert.equal(res.status, 400);
      assert.match(res.json?.message, /No OTP found/i);
    });

    it("POST /auth/password-reset should reject missing reset token", async () => {
      const res = await makeRequest("POST", "/auth/password-reset", {
        suite: "Auth",
        testName: "Password reset missing token",
        body: { password: "NewSecretPassword123" },
      });
      assert.equal(res.status, 400);
      assert.match(res.json?.message, /required/i);
    });

    it("POST /auth/password-reset should reject invalid/expired reset token", async () => {
      const res = await makeRequest("POST", "/auth/password-reset", {
        suite: "Auth",
        testName: "Password reset fake token",
        body: {
          resetToken: "fake-unverified-reset-token-12345",
          password: "NewSecretPassword123",
        },
      });
      assert.equal(res.status, 400);
      assert.match(res.json?.message, /Invalid or expired/i);
    });
  });

  describe("Community Hierarchy Lookup Endpoints", () => {
    it("GET /auth/communities should return list of active communities in data envelope", async () => {
      const res = await makeRequest("GET", "/auth/communities", {
        suite: "Auth",
        testName: "List communities",
      });
      assert.equal(res.status, 200);
      assert.equal(res.json?.success, true);
      assert.ok(Array.isArray(res.json?.data), "Expected response data to be an array");
    });

    it("GET /auth/communities/:id/blocks should return blocks in data envelope", async () => {
      if (fixtures.community?.id) {
        const res = await makeRequest(
          "GET",
          `/auth/communities/${fixtures.community.id}/blocks`,
          {
            suite: "Auth",
            testName: "Get community blocks",
          }
        );
        assert.equal(res.status, 200);
        assert.equal(res.json?.success, true);
        assert.ok(Array.isArray(res.json?.data), "Expected array of blocks");
      }

      // Non-existent ID
      const res404 = await makeRequest(
        "GET",
        "/auth/communities/00000000-0000-0000-0000-000000000000/blocks",
        {
          suite: "Auth",
          testName: "Non-existent community blocks",
        }
      );
      assert.ok([200, 404].includes(res404.status));
    });

    it("GET /auth/blocks/:blockId/units should handle valid and invalid block IDs", async () => {
      const res = await makeRequest(
        "GET",
        "/auth/blocks/00000000-0000-0000-0000-000000000000/units",
        {
          suite: "Auth",
          testName: "Non-existent block units",
        }
      );
      assert.ok([200, 404].includes(res.status));
      if (res.status === 200) {
        assert.ok(Array.isArray(res.json?.data));
      }
    });

    it("GET /auth/communities/:communityId/units should return units for community in data envelope", async () => {
      if (fixtures.community?.id) {
        const res = await makeRequest(
          "GET",
          `/auth/communities/${fixtures.community.id}/units`,
          {
            suite: "Auth",
            testName: "Get community units",
          }
        );
        assert.equal(res.status, 200);
        assert.equal(res.json?.success, true);
        assert.ok(Array.isArray(res.json?.data), "Expected array of units");
      }
    });

    it("GET /auth/communities/invalid-uuid/blocks should handle malformed parameters without crashing the process", async () => {
      const res = await makeRequest(
        "GET",
        "/auth/communities/not-a-valid-uuid-12345/blocks",
        {
          suite: "Auth",
          testName: "Malformed UUID in blocks lookup",
        }
      );
      assert.ok([200, 400, 500].includes(res.status));
    });
  });
});
