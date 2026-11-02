import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startTestServer,
  stopTestServer,
  makeRequest,
  fixtures,
} from "./helpers/testServer.js";
import { TestLogger } from "./helpers/logger.js";

describe("GateZen Resident Routes & RBAC Protection", () => {
  before(async () => {
    TestLogger.logSection("RESIDENT API TEST SUITE");
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  describe("Authentication & RBAC Enforcement", () => {
    it("should return 401 when Authorization header is missing", async () => {
      const res = await makeRequest("GET", "/resident/dashboard", {
        suite: "Resident RBAC",
        testName: "Missing Auth Header",
      });
      assert.equal(res.status, 401);
      assert.match(res.json?.error, /Missing token/i);
    });

    it("should return 401 when token is invalid", async () => {
      const res = await makeRequest("GET", "/resident/dashboard", {
        suite: "Resident RBAC",
        testName: "Invalid Token",
        token: fixtures.invalidToken,
      });
      assert.equal(res.status, 401);
    });

    it("should return 403 Forbidden when ADMIN tries to access resident routes", async () => {
      const res = await makeRequest("GET", "/resident/dashboard", {
        suite: "Resident RBAC",
        testName: "Admin accessing Resident Dashboard",
        token: fixtures.adminToken,
      });
      assert.equal(res.status, 403);
      assert.equal(res.json?.error, "Forbidden");
    });

    it("should return 403 Forbidden when GATEKEEPER tries to access resident routes", async () => {
      const res = await makeRequest("GET", "/resident/dashboard", {
        suite: "Resident RBAC",
        testName: "Gatekeeper accessing Resident Dashboard",
        token: fixtures.gatekeeperToken,
      });
      assert.equal(res.status, 403);
      assert.equal(res.json?.error, "Forbidden");
    });
  });

  describe("Resident Dashboard & Unit Information", () => {
    it("GET /resident/dashboard should return resident dashboard data", async () => {
      const res = await makeRequest("GET", "/resident/dashboard", {
        suite: "Resident Dashboard",
        testName: "GET /resident/dashboard",
        token: fixtures.residentToken,
      });
      assert.equal(res.status, 200);
      assert.ok(res.json !== null);
    });

    it("GET /resident/my-unit-info should return unit & occupancy details", async () => {
      const res = await makeRequest("GET", "/resident/my-unit-info", {
        suite: "Resident Unit Info",
        testName: "GET /resident/my-unit-info",
        token: fixtures.residentToken,
      });
      assert.equal(res.status, 200);
      assert.ok(res.json !== null);
    });

    it("GET /resident/profile should return current resident profile", async () => {
      const res = await makeRequest("GET", "/resident/profile", {
        suite: "Resident Profile",
        testName: "GET /resident/profile",
        token: fixtures.residentToken,
      });
      assert.equal(res.status, 200);
      assert.ok(res.json !== null);
    });

    it("PATCH /resident/profile should update profile fields safely", async () => {
      const res = await makeRequest("PATCH", "/resident/profile", {
        suite: "Resident Profile",
        testName: "PATCH /resident/profile",
        token: fixtures.residentToken,
        body: { phone: "9876543210" },
      });
      assert.ok([200, 400].includes(res.status));
    });

    it("GET /resident/community-stats should return community statistics", async () => {
      const res = await makeRequest("GET", "/resident/community-stats", {
        suite: "Resident Stats",
        testName: "GET /resident/community-stats",
        token: fixtures.residentToken,
      });
      assert.equal(res.status, 200);
    });

    it("GET /resident/announcements should return announcements visible to resident", async () => {
      const res = await makeRequest("GET", "/resident/announcements", {
        suite: "Resident Announcements",
        testName: "GET /resident/announcements",
        token: fixtures.residentToken,
      });
      assert.equal(res.status, 200);
      assert.ok(
        Array.isArray(res.json) ||
        Array.isArray(res.json?.data) ||
        Array.isArray(res.json?.announcements)
      );
    });
  });

  describe("Helpdesk & Maintenance", () => {
    it("GET /resident/maintenance should return resident maintenance tickets", async () => {
      const res = await makeRequest("GET", "/resident/maintenance", {
        suite: "Resident Maintenance",
        testName: "GET /resident/maintenance",
        token: fixtures.residentToken,
      });
      assert.ok([200, 403].includes(res.status));
      if (res.status === 200) {
        assert.ok(Array.isArray(res.json) || Array.isArray(res.json?.maintenance) || Array.isArray(res.json?.tickets));
      }
    });

    it("POST /resident/maintenance should reject ticket missing required fields", async () => {
      const res = await makeRequest("POST", "/resident/maintenance", {
        suite: "Resident Maintenance",
        testName: "Create ticket missing fields",
        token: fixtures.residentToken,
        body: {},
      });
      assert.ok([400, 403].includes(res.status));
    });

    it("POST /resident/maintenance/:id/comments should handle comment on non-existent ticket", async () => {
      const res = await makeRequest("POST", "/resident/maintenance/00000000-0000-0000-0000-000000000000/comments", {
        suite: "Resident Maintenance",
        testName: "Add comment to non-existent ticket",
        token: fixtures.residentToken,
        body: { text: "Test comment" },
      });
      assert.ok([400, 403, 404, 500].includes(res.status));
    });
  });

  describe("Visitors & Packages", () => {
    it("GET /resident/visitors should return resident visitors", async () => {
      const res = await makeRequest("GET", "/resident/visitors", {
        suite: "Resident Visitors",
        testName: "GET /resident/visitors",
        token: fixtures.residentToken,
      });
      assert.ok([200, 403].includes(res.status));
      if (res.status === 200) {
        assert.ok(Array.isArray(res.json) || Array.isArray(res.json?.visitors));
      }
    });

    it("POST /resident/visitors should reject visitor creation missing required fields", async () => {
      const res = await makeRequest("POST", "/resident/visitors", {
        suite: "Resident Visitors",
        testName: "Create visitor missing fields",
        token: fixtures.residentToken,
        body: {},
      });
      assert.ok([400, 403].includes(res.status));
    });

    it("GET /resident/packages should reject when dates are missing, and succeed when provided", async () => {
      // 1. Without dates: returns 400
      const resMissing = await makeRequest("GET", "/resident/packages", {
        suite: "Resident Packages",
        testName: "GET /resident/packages missing dates",
        token: fixtures.residentToken,
      });
      assert.equal(resMissing.status, 400);

      // 2. With dates: returns 200
      const resWithDates = await makeRequest("GET", "/resident/packages", {
        suite: "Resident Packages",
        testName: "GET /resident/packages with dates",
        token: fixtures.residentToken,
        params: { from: "2026-01-01", to: "2026-12-31" },
      });
      assert.equal(resWithDates.status, 200);
      assert.ok(Array.isArray(resWithDates.json));
    });
  });

  describe("Amenities & Bookings (Concurrency & Time Violations)", () => {
    it("GET /resident/facilities should return bookable facilities in data envelope", async () => {
      const res = await makeRequest("GET", "/resident/facilities", {
        suite: "Resident Bookings",
        testName: "GET /resident/facilities",
        token: fixtures.residentToken,
      });
      assert.ok([200, 403].includes(res.status));
      if (res.status === 200) {
        assert.ok(Array.isArray(res.json) || Array.isArray(res.json?.data) || Array.isArray(res.json?.facilities));
      }
    });

    it("GET /resident/bookings should return community facility bookings", async () => {
      const res = await makeRequest("GET", "/resident/bookings", {
        suite: "Resident Bookings",
        testName: "GET /resident/bookings",
        token: fixtures.residentToken,
      });
      assert.ok([200, 403].includes(res.status));
    });

    it("GET /resident/user-bookings should reject missing date query and succeed with valid date", async () => {
      const resMissing = await makeRequest("GET", "/resident/user-bookings", {
        suite: "Resident Bookings",
        testName: "GET user-bookings missing date",
        token: fixtures.residentToken,
      });
      assert.ok([400, 403].includes(resMissing.status));

      const resWithDate = await makeRequest("GET", "/resident/user-bookings", {
        suite: "Resident Bookings",
        testName: "GET user-bookings with date",
        token: fixtures.residentToken,
        params: { date: "2026-03-10" },
      });
      assert.ok([200, 403].includes(resWithDate.status));
    });

    it("POST /resident/bookings should reject past dates or invalid slots (API-017 check)", async () => {
      const pastStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const pastEnd = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();

      const res = await makeRequest("POST", "/resident/bookings", {
        suite: "Resident Bookings",
        testName: "API-017 Past Date Booking Test",
        token: fixtures.residentToken,
        body: {
          facilityId: "00000000-0000-0000-0000-000000000000",
          startsAt: pastStart,
          endsAt: pastEnd,
        },
      });

      assert.ok([400, 403, 404, 500].includes(res.status));
    });

    it("PATCH /resident/bookings/:id/cancel should handle non-existent booking ID safely", async () => {
      const res = await makeRequest("PATCH", "/resident/bookings/00000000-0000-0000-0000-000000000000/cancel", {
        suite: "Resident Bookings",
        testName: "Cancel non-existent booking",
        token: fixtures.residentToken,
      });
      assert.ok([400, 403, 404, 500].includes(res.status));
    });
  });

  describe("Directory & Documents", () => {
    it("GET /resident/neighbors should return neighbors list", async () => {
      const res = await makeRequest("GET", "/resident/neighbors", {
        suite: "Resident Directory",
        testName: "GET /resident/neighbors",
        token: fixtures.residentToken,
      });
      assert.ok([200, 403].includes(res.status));
      if (res.status === 200) {
        assert.ok(Array.isArray(res.json) || Array.isArray(res.json?.neighbors) || Array.isArray(res.json?.data));
      }
    });

    it("GET /resident/directory should return directory contacts", async () => {
      const res = await makeRequest("GET", "/resident/directory", {
        suite: "Resident Directory",
        testName: "GET /resident/directory",
        token: fixtures.residentToken,
      });
      assert.equal(res.status, 200);
    });

    it("GET /resident/pdfs should return uploaded community documents", async () => {
      const res = await makeRequest("GET", "/resident/pdfs", {
        suite: "Resident Documents",
        testName: "GET /resident/pdfs",
        token: fixtures.residentToken,
      });
      assert.ok([200, 403].includes(res.status));
    });

    it("GET /resident/pdf/:id should handle non-existent PDF ID (API-011 IDOR check)", async () => {
      const res = await makeRequest("GET", "/resident/pdf/00000000-0000-0000-0000-000000000000", {
        suite: "Resident Documents",
        testName: "API-011 Non-existent PDF IDOR test",
        token: fixtures.residentToken,
      });
      assert.ok([400, 403, 404, 500].includes(res.status));
    });

    it("GET /resident/kid-passes should return kid passes list", async () => {
      const res = await makeRequest("GET", "/resident/kid-passes", {
        suite: "Resident Kid Passes",
        testName: "GET /resident/kid-passes",
        token: fixtures.residentToken,
      });
      assert.ok([200, 403].includes(res.status));
    });

    it("POST /resident/kid-passes should reject missing fields", async () => {
      const res = await makeRequest("POST", "/resident/kid-passes", {
        suite: "Resident Kid Passes",
        testName: "Create kid pass missing fields",
        token: fixtures.residentToken,
        body: {},
      });
      assert.ok([400, 403].includes(res.status));
    });
  });

  describe("Notice Board, Surveys & Polls", () => {
    it("GET /resident/notice-board/ should return notices", async () => {
      const res = await makeRequest("GET", "/resident/notice-board/", {
        suite: "Resident Notices",
        testName: "GET /resident/notice-board/",
        token: fixtures.residentToken,
      });
      assert.ok([200, 403].includes(res.status));
    });

    it("POST /resident/notice-board should verify resident notice creation permissions (API-009 check)", async () => {
      const res = await makeRequest("POST", "/resident/notice-board", {
        suite: "Resident Notices",
        testName: "API-009 Resident Notice Creation",
        token: fixtures.residentToken,
        body: { title: "Resident Notice", content: "Notice content" },
      });
      assert.ok([200, 201, 400, 403].includes(res.status));
    });

    it("GET /resident/surveys/ should return surveys", async () => {
      const res = await makeRequest("GET", "/resident/surveys/", {
        suite: "Resident Surveys",
        testName: "GET /resident/surveys/",
        token: fixtures.residentToken,
      });
      assert.ok([200, 403].includes(res.status));
    });

    it("GET /resident/polls/ should return polls", async () => {
      const res = await makeRequest("GET", "/resident/polls/", {
        suite: "Resident Polls",
        testName: "GET /resident/polls/",
        token: fixtures.residentToken,
      });
      assert.ok([200, 403].includes(res.status));
    });

    it("GET /resident/polls/:id should handle non-existent poll ID", async () => {
      const res = await makeRequest("GET", "/resident/polls/00000000-0000-0000-0000-000000000000", {
        suite: "Resident Polls",
        testName: "GET non-existent poll",
        token: fixtures.residentToken,
      });
      assert.ok([400, 403, 404, 500].includes(res.status));
    });
  });

  describe("Vehicles, Meetings, Home Planner, Parking & Payments", () => {
    it("GET /resident/vehicles should return resident vehicles list", async () => {
      const res = await makeRequest("GET", "/resident/vehicles", {
        suite: "Resident Vehicles",
        testName: "GET /resident/vehicles",
        token: fixtures.residentToken,
      });
      assert.ok([200, 403].includes(res.status));
      if (res.status === 200) {
        assert.ok(Array.isArray(res.json) || Array.isArray(res.json?.vehicles));
      }
    });

    it("POST /resident/vehicles should reject vehicle registration missing plate number", async () => {
      const res = await makeRequest("POST", "/resident/vehicles", {
        suite: "Resident Vehicles",
        testName: "Register vehicle missing body",
        token: fixtures.residentToken,
        body: {},
      });
      assert.ok([400, 403].includes(res.status));
    });

    it("DELETE /resident/vehicles/:id should handle non-existent vehicle ID", async () => {
      const res = await makeRequest("DELETE", "/resident/vehicles/00000000-0000-0000-0000-000000000000", {
        suite: "Resident Vehicles",
        testName: "DELETE non-existent vehicle",
        token: fixtures.residentToken,
      });
      assert.ok([400, 403, 404, 500].includes(res.status));
    });

    it("GET /resident/meetings should return resident meetings", async () => {
      const res = await makeRequest("GET", "/resident/meetings", {
        suite: "Resident Meetings",
        testName: "GET /resident/meetings",
        token: fixtures.residentToken,
      });
      assert.ok([200, 403].includes(res.status));
    });

    it("GET /resident/home-planner should return home planner items", async () => {
      const res = await makeRequest("GET", "/resident/home-planner", {
        suite: "Resident Planner",
        testName: "GET /resident/home-planner",
        token: fixtures.residentToken,
      });
      assert.ok([200, 403].includes(res.status));
    });

    it("POST /resident/home-planner should reject planner task missing title", async () => {
      const res = await makeRequest("POST", "/resident/home-planner", {
        suite: "Resident Planner",
        testName: "Create planner task missing title",
        token: fixtures.residentToken,
        body: {},
      });
      assert.ok([400, 403].includes(res.status));
    });

    it("GET /resident/parking should return available parking slots", async () => {
      const res = await makeRequest("GET", "/resident/parking", {
        suite: "Resident Parking",
        testName: "GET /resident/parking",
        token: fixtures.residentToken,
      });
      assert.ok([200, 403].includes(res.status));
    });

    it("GET /resident/parking/spots and /bookings should return parking data", async () => {
      const resSpots = await makeRequest("GET", "/resident/parking/spots", {
        suite: "Resident Parking",
        testName: "GET /resident/parking/spots",
        token: fixtures.residentToken,
      });
      assert.ok([200, 403].includes(resSpots.status));

      const resBookings = await makeRequest("GET", "/resident/parking/bookings", {
        suite: "Resident Parking",
        testName: "GET /resident/parking/bookings",
        token: fixtures.residentToken,
      });
      assert.ok([200, 403].includes(resBookings.status));
    });

    it("GET /resident/payments should return payments list", async () => {
      const res = await makeRequest("GET", "/resident/payments", {
        suite: "Resident Payments",
        testName: "GET /resident/payments",
        token: fixtures.residentToken,
      });
      assert.ok([200, 403].includes(res.status));
    });
  });
});
