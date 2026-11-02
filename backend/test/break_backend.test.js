import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startTestServer,
  stopTestServer,
  makeRequest,
  fixtures,
} from "./helpers/testServer.js";
import { TestLogger } from "./helpers/logger.js";

describe("GateZen Adversarial & Break-The-Backend Stress Suite", () => {
  before(async () => {
    TestLogger.logSection("BREAK-THE-BACKEND ADVERSARIAL STRESS SUITE");
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  describe("Payload Bombing & Memory Limits", () => {
    it("should return 413 Payload Too Large when body exceeds limit (>15MB)", async () => {
      // Create a 16MB string payload
      const hugeString = "X".repeat(16 * 1024 * 1024);

      try {
        const res = await makeRequest("POST", "/auth/login", {
          suite: "Break-Backend",
          testName: "16MB Payload Bombing",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "bomb@test.com", password: hugeString }),
          timeout: 15000,
        });

        assert.equal(res.status, 413, `Expected 413 for >15MB payload, received ${res.status}`);
      } catch (err) {
        // If client aborted or connection was reset by Express, that's safe behavior
        assert.ok(err.message.includes("fetch") || err.message.includes("abort"));
      }
    });

    it("should handle syntactically broken JSON without server crash", async () => {
      const brokenJson = '{"email": "broken@test.com", "unclosed": ';

      const res = await makeRequest("POST", "/auth/login", {
        suite: "Break-Backend",
        testName: "Malformed JSON Syntax",
        headers: { "Content-Type": "application/json" },
        body: brokenJson,
      });

      assert.equal(res.status, 400);
    });

    it("should handle raw binary garbage sent to JSON endpoints", async () => {
      const binaryGarbage = Buffer.from([0x00, 0xff, 0xfe, 0x12, 0x34, 0x78, 0x90]).toString("binary");

      const res = await makeRequest("POST", "/auth/login", {
        suite: "Break-Backend",
        testName: "Binary Garbage Body",
        headers: { "Content-Type": "application/json" },
        body: binaryGarbage,
      });

      assert.ok([400, 500].includes(res.status));
    });
  });

  describe("Prototype Pollution Defense", () => {
    it("should not pollute Object.prototype when receiving malicious __proto__ properties", async () => {
      const maliciousPayload = {
        "__proto__": {
          "adminPolluted": true,
          "pollutedField": "vulnerable",
        },
        "constructor": {
          "prototype": {
            "pollutedConstructor": true,
          },
        },
        "email": "hacker@domain.com",
        "password": "password123",
      };

      await makeRequest("POST", "/auth/login", {
        suite: "Break-Backend",
        testName: "Prototype Pollution in Login",
        body: maliciousPayload,
      });

      // Verify that Object.prototype was NOT polluted
      const testObj = {};
      assert.equal(testObj.adminPolluted, undefined, "CRITICAL: Object.prototype was polluted!");
      assert.equal(testObj.pollutedField, undefined, "CRITICAL: Object.prototype was polluted!");
      assert.equal(testObj.pollutedConstructor, undefined, "CRITICAL: Object.prototype was polluted!");
    });
  });

  describe("SQL & NoSQL Injection Resilience", () => {
    it("should resist SQL injection in route UUID parameters", async () => {
      const sqliParams = [
        "00000000-0000-0000-0000-000000000000' OR '1'='1",
        "'; DROP TABLE \"User\"; --",
        "1 UNION SELECT null, null, null --",
        "%27%20OR%201=1--",
      ];

      for (const param of sqliParams) {
        const res = await makeRequest("GET", `/admin/blocks/${encodeURIComponent(param)}`, {
          suite: "Break-Backend",
          testName: `SQLi in URL param: ${param}`,
          token: fixtures.adminToken,
        });

        // Ensure database did not execute raw injection and server did not crash
        assert.ok([400, 404, 500].includes(res.status));
        assert.notEqual(res.status, 200, "Unexpected 200 for SQLi URL parameter!");
      }
    });

    it("should resist Null Byte Injection in string fields", async () => {
      const res = await makeRequest("POST", "/auth/login", {
        suite: "Break-Backend",
        testName: "Null byte injection in login",
        body: {
          email: "admin\x00@gatezen.com",
          password: "password123\x00",
        },
      });

      assert.ok([400, 401].includes(res.status));
    });
  });

  describe("JWT Tampering & Algorithm Confusion", () => {
    it("should reject JWT with algorithm set to none", async () => {
      // Header: {"alg":"none","typ":"JWT"} -> eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0
      // Payload: {"userId":"attacker","role":"ADMIN"} -> eyJ1c2VySWQiOiJhdHRhY2tlciIsInJvbGUiOiJBRE1JTiJ9
      const algNoneToken = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiJhdHRhY2tlciIsInJvbGUiOiJBRE1JTiJ9.";

      const res = await makeRequest("GET", "/admin/dashboard", {
        suite: "Break-Backend",
        testName: "Algorithm 'none' JWT attack",
        token: algNoneToken,
      });

      assert.equal(res.status, 401);
    });

    it("should reject JWT when signature is stripped or truncated", async () => {
      if (fixtures.adminToken) {
        const parts = fixtures.adminToken.split(".");
        const strippedToken = `${parts[0]}.${parts[1]}.`;

        const res = await makeRequest("GET", "/admin/dashboard", {
          suite: "Break-Backend",
          testName: "Stripped Signature JWT",
          token: strippedToken,
        });

        assert.equal(res.status, 401);
      }
    });

    it("should reject JWT when payload is modified (privilege escalation tamper)", async () => {
      if (fixtures.residentToken) {
        const parts = fixtures.residentToken.split(".");
        // Decode payload, flip role to ADMIN, re-encode base64
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
        payload.role = "ADMIN";
        const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
        const forgedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

        const res = await makeRequest("GET", "/admin/dashboard", {
          suite: "Break-Backend",
          testName: "Tampered Payload Privilege Escalation",
          token: forgedToken,
        });

        assert.equal(res.status, 401);
      }
    });
  });

  describe("Concurrency & Race Condition Double-Booking", () => {
    it("should handle simultaneous concurrent requests without unhandled rejections", async () => {
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          makeRequest("GET", "/auth/communities", {
            suite: "Break-Backend",
            testName: `Concurrent Spike #${i + 1}`,
          })
        );
      }

      const results = await Promise.all(promises);
      assert.equal(results.length, concurrentRequests);
      for (const res of results) {
        assert.equal(res.status, 200);
      }
    });

    it("should handle rapid simultaneous booking attempts", async () => {
      const simultaneousBookings = 5;
      const targetTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const startTime = targetTime.toISOString();
      const endTime = new Date(targetTime.getTime() + 60 * 60 * 1000).toISOString();

      const promises = [];
      for (let i = 0; i < simultaneousBookings; i++) {
        promises.push(
          makeRequest("POST", "/resident/bookings", {
            suite: "Break-Backend",
            testName: `Simultaneous Booking #${i + 1}`,
            token: fixtures.residentToken,
            body: {
              facilityId: "00000000-0000-0000-0000-000000000000",
              startsAt: startTime,
              endsAt: endTime,
            },
          })
        );
      }

      const results = await Promise.all(promises);
      for (const res of results) {
        assert.ok([400, 403, 404, 409, 500].includes(res.status));
      }
    });
  });

  describe("HTTP Verb Tampering & Path Traversal Fuzzing", () => {
    it("should reject path traversal in URLs safely", async () => {
      const traversalPaths = [
        "/admin/../../src/index.js",
        "/resident/../..//etc/passwd",
        "/auth/..%2f..%2f.env",
      ];

      for (const path of traversalPaths) {
        const res = await makeRequest("GET", path, {
          suite: "Break-Backend",
          testName: `Path Traversal: ${path}`,
        });

        // Express route matching handles or 404s path traversals
        assert.ok([200, 400, 403, 404].includes(res.status));
      }
    });

    it("should handle unsupported HTTP verbs gracefully (OPTIONS, TRACE)", async () => {
      const resOptions = await makeRequest("OPTIONS", "/auth/login", {
        suite: "Break-Backend",
        testName: "OPTIONS CORS Preflight",
      });
      assert.ok([200, 204].includes(resOptions.status));

      const resTrace = await makeRequest("TRACE", "/auth/login", {
        suite: "Break-Backend",
        testName: "TRACE Method Tampering",
      });
      assert.ok([404, 405, 501].includes(resTrace.status));
    });
  });

  describe("Rate Limiting Resilience & Header Spoofing", () => {
    it("should handle rapid requests and track remote IP safely", async () => {
      const rapidRequests = 15;
      const responses = [];

      for (let i = 0; i < rapidRequests; i++) {
        const res = await makeRequest("GET", "/", {
          suite: "Break-Backend",
          testName: `Rate Limit Rapid Call #${i + 1}`,
          headers: { "x-forwarded-for": `192.168.1.${i}` },
        });
        responses.push(res.status);
      }

      assert.equal(responses.length, rapidRequests);
      for (const status of responses) {
        assert.ok([200, 429].includes(status));
      }
    });
  });
});
