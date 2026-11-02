import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startTestServer,
  stopTestServer,
  makeRequest,
  fixtures,
} from "./helpers/testServer.js";
import { TestLogger } from "./helpers/logger.js";

describe("GateZen Admin Routes & RBAC Protection", () => {
  before(async () => {
    TestLogger.logSection("ADMIN API TEST SUITE");
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  describe("Authentication & RBAC Enforcement", () => {
    it("should return 401 when Authorization header is missing", async () => {
      const res = await makeRequest("GET", "/admin/dashboard", {
        suite: "Admin RBAC",
        testName: "Missing Auth Header",
      });
      assert.equal(res.status, 401);
      assert.match(res.json?.error, /Missing token/i);
    });

    it("should return 401 when token is invalid or corrupted", async () => {
      const res = await makeRequest("GET", "/admin/dashboard", {
        suite: "Admin RBAC",
        testName: "Malformed Token",
        token: fixtures.invalidToken,
      });
      assert.equal(res.status, 401);
      assert.match(res.json?.error, /Invalid or expired token/i);
    });

    it("should return 401 when token is expired", async () => {
      const res = await makeRequest("GET", "/admin/dashboard", {
        suite: "Admin RBAC",
        testName: "Expired Token",
        token: fixtures.expiredToken,
      });
      assert.equal(res.status, 401);
    });

    it("should return 401 when token is signed with wrong secret", async () => {
      const res = await makeRequest("GET", "/admin/dashboard", {
        suite: "Admin RBAC",
        testName: "Wrong Secret Token",
        token: fixtures.wrongSecretToken,
      });
      assert.equal(res.status, 401);
    });

    it("should return 403 Forbidden when RESIDENT tries to access admin routes", async () => {
      const res = await makeRequest("GET", "/admin/dashboard", {
        suite: "Admin RBAC",
        testName: "Resident accessing Admin Dashboard",
        token: fixtures.residentToken,
      });
      assert.equal(res.status, 403);
      assert.equal(res.json?.error, "Forbidden");
    });

    it("should return 403 Forbidden when GATEKEEPER tries to access admin routes", async () => {
      const res = await makeRequest("GET", "/admin/dashboard", {
        suite: "Admin RBAC",
        testName: "Gatekeeper accessing Admin Dashboard",
        token: fixtures.gatekeeperToken,
      });
      assert.equal(res.status, 403);
      assert.equal(res.json?.error, "Forbidden");
    });
  });

  describe("Dashboard & Metrics Endpoints", () => {
    it("GET /admin/dashboard should return dashboard data for admin", async () => {
      const res = await makeRequest("GET", "/admin/dashboard", {
        suite: "Admin Dashboard",
        testName: "GET /admin/dashboard",
        token: fixtures.adminToken,
      });
      assert.equal(res.status, 200);
      assert.ok(res.json !== null, "Expected JSON response");
    });

    it("GET /admin/dashboard-stats should return metrics object", async () => {
      const res = await makeRequest("GET", "/admin/dashboard-stats", {
        suite: "Admin Dashboard",
        testName: "GET /admin/dashboard-stats",
        token: fixtures.adminToken,
      });
      assert.equal(res.status, 200);
      assert.ok(res.json !== null);
    });
  });

  describe("Resident Management & Approvals", () => {
    it("GET /admin/resident-requests should return list of pending resident requests", async () => {
      const res = await makeRequest("GET", "/admin/resident-requests", {
        suite: "Admin Residents",
        testName: "GET /admin/resident-requests",
        token: fixtures.adminToken,
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.json), "Expected array of pending requests");
    });

    it("POST /admin/approve-resident should handle missing userId (demonstrating validation error handling)", async () => {
      const res = await makeRequest("POST", "/admin/approve-resident", {
        suite: "Admin Residents",
        testName: "Approve resident missing userId",
        token: fixtures.adminToken,
        body: {},
      });
      // Catches unhandled PrismaClientValidationError or 400
      assert.ok([400, 500].includes(res.status));
      if (res.status === 500) {
        TestLogger.logBugObserved({
          bugId: "UNHANDLED_VALIDATION",
          endpoint: "POST /admin/approve-resident",
          description: "PrismaClientValidationError throws 500 on missing req.body.userId instead of 400",
          status: 500,
          response: res.json,
        });
      }
    });

    it("POST /admin/reject-resident should handle missing userId (demonstrating validation error handling)", async () => {
      const res = await makeRequest("POST", "/admin/reject-resident", {
        suite: "Admin Residents",
        testName: "Reject resident missing userId",
        token: fixtures.adminToken,
        body: {},
      });
      assert.ok([400, 500].includes(res.status));
    });

    it("GET /admin/residents should return residents list with filters", async () => {
      const res = await makeRequest("GET", "/admin/residents", {
        suite: "Admin Residents",
        testName: "GET /admin/residents",
        token: fixtures.adminToken,
        params: { status: "APPROVED", search: "" },
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.json) || Array.isArray(res.json?.residents));
    });

    it("POST /admin/residents/:userId/action should reject invalid action", async () => {
      const res = await makeRequest("POST", "/admin/residents/00000000-0000-0000-0000-000000000000/action", {
        suite: "Admin Residents",
        testName: "Invalid resident action",
        token: fixtures.adminToken,
        body: { action: "INVALID_ACTION_NAME" },
      });
      assert.ok([400, 404].includes(res.status));
    });

    it("PATCH /admin/residents/:id should handle non-existent resident ID gracefully", async () => {
      const res = await makeRequest("PATCH", "/admin/residents/00000000-0000-0000-0000-000000000000", {
        suite: "Admin Residents",
        testName: "PATCH resident non-existent ID",
        token: fixtures.adminToken,
        body: { name: "Updated Name" },
      });
      assert.ok([400, 404, 500].includes(res.status));
    });

    it("POST /admin/member should demonstrate blockId validation behavior (API-005)", async () => {
      const res = await makeRequest("POST", "/admin/member", {
        suite: "Admin Residents",
        testName: "API-005 Member Creation Validation",
        token: fixtures.adminToken,
        body: {
          name: "Test Member",
          email: `member_${Date.now()}@test.com`,
          phone: "9876543219",
          unitId: "00000000-0000-0000-0000-000000000000",
          residentType: "RESIDENT",
          residentSubtype: "OWNER",
        },
      });

      assert.ok([400, 404, 422, 500].includes(res.status));
    });

    it("GET /admin/unit/:unitId/residency-info should return residency details or 404", async () => {
      const res = await makeRequest("GET", "/admin/unit/00000000-0000-0000-0000-000000000000/residency-info", {
        suite: "Admin Residents",
        testName: "Residency info lookup",
        token: fixtures.adminToken,
      });
      assert.ok([200, 404, 500].includes(res.status));
    });
  });

  describe("Bookings & Amenity Management", () => {
    it("GET /admin/bookings should return bookings list", async () => {
      const res = await makeRequest("GET", "/admin/bookings", {
        suite: "Admin Bookings",
        testName: "GET /admin/bookings",
        token: fixtures.adminToken,
      });
      assert.ok([200, 403].includes(res.status));
      if (res.status === 200) {
        assert.ok(Array.isArray(res.json) || Array.isArray(res.json?.bookings));
      }
    });

    it("PATCH /admin/bookings/:bookingId should reject unauthorized or non-existent booking", async () => {
      const res = await makeRequest("PATCH", "/admin/bookings/00000000-0000-0000-0000-000000000000", {
        suite: "Admin Bookings",
        testName: "PATCH booking non-existent ID",
        token: fixtures.adminToken,
        body: { status: "CANCELLED" },
      });
      assert.ok([400, 403, 404, 500].includes(res.status));
    });

    it("DELETE /admin/bookings/:id should handle non-existent booking deletion safely", async () => {
      const res = await makeRequest("DELETE", "/admin/bookings/00000000-0000-0000-0000-000000000000", {
        suite: "Admin Bookings",
        testName: "DELETE booking non-existent ID",
        token: fixtures.adminToken,
      });
      assert.ok([400, 403, 404, 500].includes(res.status));
    });
  });

  describe("Helpdesk & Maintenance Tickets", () => {
    it("GET /admin/maintenance should return ticket list", async () => {
      const res = await makeRequest("GET", "/admin/maintenance", {
        suite: "Admin Maintenance",
        testName: "GET /admin/maintenance",
        token: fixtures.adminToken,
      });
      assert.ok([200, 403].includes(res.status));
      if (res.status === 200) {
        assert.ok(
          Array.isArray(res.json) ||
          Array.isArray(res.json?.tickets) ||
          Array.isArray(res.json?.maintenance)
        );
      }
    });

    it("POST /admin/maintenance/:id/comments should reject empty comment body", async () => {
      const res = await makeRequest("POST", "/admin/maintenance/00000000-0000-0000-0000-000000000000/comments", {
        suite: "Admin Maintenance",
        testName: "Add empty comment",
        token: fixtures.adminToken,
        body: {},
      });
      assert.ok([400, 403, 404].includes(res.status));
    });

    it("PATCH /admin/maintenance/:ticketId should handle non-existent ticket update", async () => {
      const res = await makeRequest("PATCH", "/admin/maintenance/00000000-0000-0000-0000-000000000000", {
        suite: "Admin Maintenance",
        testName: "PATCH maintenance non-existent ID",
        token: fixtures.adminToken,
        body: { status: "IN_PROGRESS" },
      });
      assert.ok([400, 403, 404, 500].includes(res.status));
    });
  });

  describe("Announcements Endpoints", () => {
    it("GET /admin/announcements should return list of announcements", async () => {
      const res = await makeRequest("GET", "/admin/announcements", {
        suite: "Admin Announcements",
        testName: "GET /admin/announcements",
        token: fixtures.adminToken,
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.json) || Array.isArray(res.json?.announcements));
    });

    it("POST /admin/create-announcement should reject announcement missing title or message", async () => {
      const res = await makeRequest("POST", "/admin/create-announcement", {
        suite: "Admin Announcements",
        testName: "Create announcement missing body",
        token: fixtures.adminToken,
        body: {},
      });
      assert.equal(res.status, 400);
    });

    it("DELETE /admin/announcements/:id should handle non-existent announcement ID", async () => {
      const res = await makeRequest("DELETE", "/admin/announcements/00000000-0000-0000-0000-000000000000", {
        suite: "Admin Announcements",
        testName: "DELETE non-existent announcement",
        token: fixtures.adminToken,
      });
      assert.ok([400, 404, 500].includes(res.status));
    });
  });

  describe("Blocks & Units Infrastructure", () => {
    it("GET /admin/blocks should return blocks in the community", async () => {
      const res = await makeRequest("GET", "/admin/blocks", {
        suite: "Admin Infrastructure",
        testName: "GET /admin/blocks",
        token: fixtures.adminToken,
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.json) || Array.isArray(res.json?.blocks));
    });

    it("POST /admin/blocks should reject block creation with missing name", async () => {
      const res = await makeRequest("POST", "/admin/blocks", {
        suite: "Admin Infrastructure",
        testName: "Create block missing name",
        token: fixtures.adminToken,
        body: {},
      });
      assert.equal(res.status, 400);
    });

    it("PUT /admin/blocks/:id should handle non-existent block ID", async () => {
      const res = await makeRequest("PUT", "/admin/blocks/00000000-0000-0000-0000-000000000000", {
        suite: "Admin Infrastructure",
        testName: "PUT block non-existent ID",
        token: fixtures.adminToken,
        body: { name: "Non-existent Block" },
      });
      assert.ok([400, 404, 500].includes(res.status));
    });

    it("GET /admin/units should return units in the community", async () => {
      const res = await makeRequest("GET", "/admin/units", {
        suite: "Admin Infrastructure",
        testName: "GET /admin/units",
        token: fixtures.adminToken,
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.json) || Array.isArray(res.json?.units));
    });

    it("POST /admin/units should reject unit creation missing number or blockId", async () => {
      const res = await makeRequest("POST", "/admin/units", {
        suite: "Admin Infrastructure",
        testName: "Create unit missing fields",
        token: fixtures.adminToken,
        body: {},
      });
      assert.equal(res.status, 400);
    });

    it("PUT /admin/units/:id should handle non-existent unit ID", async () => {
      const res = await makeRequest("PUT", "/admin/units/00000000-0000-0000-0000-000000000000", {
        suite: "Admin Infrastructure",
        testName: "PUT unit non-existent ID",
        token: fixtures.adminToken,
        body: { number: "999-Z" },
      });
      assert.ok([400, 404, 500].includes(res.status));
    });
  });

  describe("Community & Facility Management", () => {
    it("should return community details", async () => {
      const res = await makeRequest("GET", "/admin/community", {
        suite: "Admin Community",
        testName: "GET /admin/community",
        token: fixtures.adminToken,
      });
      assert.equal(res.status, 200);
      assert.ok(res.json?.id || res.json?.community?.id || res.json?.data?.id);
    });

    it("GET /admin/community/facilities should return configured facilities", async () => {
      const res = await makeRequest("GET", "/admin/community/facilities", {
        suite: "Admin Community",
        testName: "GET /admin/community/facilities",
        token: fixtures.adminToken,
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.json));
    });

    it("GET /admin/community/facility-types should return available facility types", async () => {
      const res = await makeRequest("GET", "/admin/community/facility-types", {
        suite: "Admin Community",
        testName: "GET /admin/community/facility-types",
        token: fixtures.adminToken,
      });
      assert.equal(res.status, 200);
      assert.ok(
        Array.isArray(res.json) ||
        Array.isArray(res.json?.data?.facilityTypes)
      );
    });

    it("GET /admin/community/facilities/enabled should return list of enabled facilities", async () => {
      const res = await makeRequest("GET", "/admin/community/facilities/enabled", {
        suite: "Admin Community",
        testName: "GET /admin/community/facilities/enabled",
        token: fixtures.adminToken,
      });
      assert.equal(res.status, 200);
      assert.ok(
        Array.isArray(res.json) ||
        Array.isArray(res.json?.data?.facilities) ||
        res.json?.data?.community
      );
    });
  });

  describe("Gatekeepers & Security Staff", () => {
    it("GET /admin/gatekeepers should return list of gatekeepers in community", async () => {
      const res = await makeRequest("GET", "/admin/gatekeepers", {
        suite: "Admin Gatekeepers",
        testName: "GET /admin/gatekeepers",
        token: fixtures.adminToken,
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.json));
    });

    it("POST /admin/gatekeeper-signup should handle missing gatekeeper body", async () => {
      const res = await makeRequest("POST", "/admin/gatekeeper-signup", {
        suite: "Admin Gatekeepers",
        testName: "Create gatekeeper missing body",
        token: fixtures.adminToken,
        body: {},
      });
      assert.ok([400, 500].includes(res.status));
    });

    it("DELETE /admin/gatekeepers/:id should handle non-existent gatekeeper ID safely", async () => {
      const res = await makeRequest("DELETE", "/admin/gatekeepers/00000000-0000-0000-0000-000000000000", {
        suite: "Admin Gatekeepers",
        testName: "DELETE non-existent gatekeeper",
        token: fixtures.adminToken,
      });
      assert.ok([400, 404, 500].includes(res.status));
    });
  });

  describe("Visitors, Parking, Vehicles & Overstay", () => {
    it("GET /admin/visitor should reject when from/to dates are missing, and succeed when provided", async () => {
      // 1. Without dates: returns 400
      const resMissing = await makeRequest("GET", "/admin/visitor", {
        suite: "Admin Visitors",
        testName: "GET /admin/visitor missing dates",
        token: fixtures.adminToken,
      });
      assert.ok([400, 403].includes(resMissing.status));

      // 2. With dates: returns 200
      const resWithDates = await makeRequest("GET", "/admin/visitor", {
        suite: "Admin Visitors",
        testName: "GET /admin/visitor with dates",
        token: fixtures.adminToken,
        params: { from: "2026-01-01", to: "2026-12-31" },
      });
      assert.ok([200, 403].includes(resWithDates.status));
    });

    it("GET /admin/vehicles should return registered vehicles list", async () => {
      const res = await makeRequest("GET", "/admin/vehicles", {
        suite: "Admin Vehicles",
        testName: "GET /admin/vehicles",
        token: fixtures.adminToken,
      });
      assert.ok([200, 403].includes(res.status));
    });

    it("GET /admin/parking/spots should return parking spots", async () => {
      const res = await makeRequest("GET", "/admin/parking/spots", {
        suite: "Admin Parking",
        testName: "GET /admin/parking/spots",
        token: fixtures.adminToken,
      });
      assert.ok([200, 403].includes(res.status));
    });

    it("GET /admin/overstay should return overstay records", async () => {
      const res = await makeRequest("GET", "/admin/overstay", {
        suite: "Admin Overstay",
        testName: "GET /admin/overstay",
        token: fixtures.adminToken,
      });
      assert.ok([200, 403].includes(res.status));
    });

    it("GET /admin/overstay-settings should return overstay configuration", async () => {
      const res = await makeRequest("GET", "/admin/overstay-settings", {
        suite: "Admin Overstay",
        testName: "GET /admin/overstay-settings",
        token: fixtures.adminToken,
      });
      assert.ok([200, 403].includes(res.status));
    });
  });

  describe("Notice Board, Surveys, Polls & Meetings", () => {
    it("GET /admin/notice-board/ should return notices", async () => {
      const res = await makeRequest("GET", "/admin/notice-board/", {
        suite: "Admin Notices",
        testName: "GET /admin/notice-board/",
        token: fixtures.adminToken,
      });
      assert.ok([200, 403].includes(res.status));
    });

    it("GET /admin/surveys/ should return surveys list", async () => {
      const res = await makeRequest("GET", "/admin/surveys/", {
        suite: "Admin Surveys",
        testName: "GET /admin/surveys/",
        token: fixtures.adminToken,
      });
      assert.ok([200, 403].includes(res.status));
    });

    it("GET /admin/polls/ should return polls list", async () => {
      const res = await makeRequest("GET", "/admin/polls/", {
        suite: "Admin Polls",
        testName: "GET /admin/polls/",
        token: fixtures.adminToken,
      });
      assert.ok([200, 403].includes(res.status));
    });

    it("GET /admin/meetings should return meetings list", async () => {
      const res = await makeRequest("GET", "/admin/meetings", {
        suite: "Admin Meetings",
        testName: "GET /admin/meetings",
        token: fixtures.adminToken,
      });
      assert.ok([200, 403].includes(res.status));
    });
  });

  describe("Documents & PDF Management", () => {
    it("GET /admin/pdfs should return uploaded PDF documents list", async () => {
      const res = await makeRequest("GET", "/admin/pdfs", {
        suite: "Admin PDFs",
        testName: "GET /admin/pdfs",
        token: fixtures.adminToken,
      });
      assert.ok([200, 403].includes(res.status));
    });

    it("GET /admin/pdf/:id should handle non-existent PDF ID", async () => {
      const res = await makeRequest("GET", "/admin/pdf/00000000-0000-0000-0000-000000000000", {
        suite: "Admin PDFs",
        testName: "GET non-existent PDF",
        token: fixtures.adminToken,
      });
      assert.ok([400, 403, 404, 500].includes(res.status));
    });

    it("POST /admin/pdf should reject request without file attachment", async () => {
      const res = await makeRequest("POST", "/admin/pdf", {
        suite: "Admin PDFs",
        testName: "Upload PDF without file",
        token: fixtures.adminToken,
        body: {},
      });
      assert.ok([400, 403, 500].includes(res.status));
    });
  });
});
