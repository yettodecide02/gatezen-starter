import "dotenv/config";
import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma.js";
import { TestLogger } from "./logger.js";

// Ensure VERCEL=1 so index.js does not auto-listen on port 5000
process.env.VERCEL = "1";

let server = null;
let baseUrl = "";
let serverPort = 0;

// Test fixtures cache
export const fixtures = {
  adminUser: null,
  residentUser: null,
  gatekeeperUser: null,
  superAdminUser: null,
  community: null,
  adminToken: null,
  residentToken: null,
  gatekeeperToken: null,
  superAdminToken: null,
  expiredToken: null,
  invalidToken: "ey.malformed.jwt",
  unknownUserToken: null,
  wrongSecretToken: null,
};

/**
 * Initializes test fixtures by resolving actual IDs from database
 */
export async function initializeFixtures() {
  try {
    // 1. Fetch community
    fixtures.community = await prisma.community.findFirst({
      include: { plan: true },
    });

    if (!fixtures.community) {
      // Fallback: create mock community if none
      fixtures.community = { id: "0e3842de-5050-479d-a092-25de4f1523ab", name: "Test Community" };
    }

    // 2. Fetch users by role
    fixtures.adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN", communityId: fixtures.community.id },
    }) || await prisma.user.findFirst({ where: { role: "ADMIN" } });

    fixtures.residentUser = await prisma.user.findFirst({
      where: { role: "RESIDENT", communityId: fixtures.community.id },
    }) || await prisma.user.findFirst({ where: { role: "RESIDENT" } });

    fixtures.gatekeeperUser = await prisma.user.findFirst({
      where: { role: "GATEKEEPER", communityId: fixtures.community.id },
    }) || await prisma.user.findFirst({ where: { role: "GATEKEEPER" } });

    fixtures.superAdminUser = await prisma.superAdmin.findFirst();

    // 3. Generate tokens
    const secret = process.env.JWT_SECRET || "test-secret";

    if (fixtures.adminUser) {
      fixtures.adminToken = jwt.sign(
        {
          userId: fixtures.adminUser.id,
          id: fixtures.adminUser.id,
          role: "ADMIN",
          communityId: fixtures.adminUser.communityId,
        },
        secret,
        { expiresIn: "7d" }
      );
    }

    if (fixtures.residentUser) {
      fixtures.residentToken = jwt.sign(
        {
          userId: fixtures.residentUser.id,
          id: fixtures.residentUser.id,
          role: "RESIDENT",
          communityId: fixtures.residentUser.communityId,
        },
        secret,
        { expiresIn: "7d" }
      );
    }

    if (fixtures.gatekeeperUser) {
      fixtures.gatekeeperToken = jwt.sign(
        {
          userId: fixtures.gatekeeperUser.id,
          id: fixtures.gatekeeperUser.id,
          role: "GATEKEEPER",
          communityId: fixtures.gatekeeperUser.communityId,
        },
        secret,
        { expiresIn: "7d" }
      );
    }

    if (fixtures.superAdminUser) {
      fixtures.superAdminToken = jwt.sign(
        { superAdminId: fixtures.superAdminUser.id },
        secret,
        { expiresIn: "7d" }
      );
    }

    // Token with expired timestamp
    fixtures.expiredToken = jwt.sign(
      {
        userId: fixtures.adminUser?.id || "user-id",
        id: fixtures.adminUser?.id || "user-id",
        role: "ADMIN",
      },
      secret,
      { expiresIn: -10 }
    );

    // Token for non-existent user
    fixtures.unknownUserToken = jwt.sign(
      {
        userId: "00000000-0000-0000-0000-000000000000",
        id: "00000000-0000-0000-0000-000000000000",
        role: "ADMIN",
      },
      secret,
      { expiresIn: "1d" }
    );

    // Token signed with incorrect secret
    fixtures.wrongSecretToken = jwt.sign(
      {
        userId: fixtures.adminUser?.id || "user-id",
        id: fixtures.adminUser?.id || "user-id",
        role: "ADMIN",
      },
      "completely-wrong-untrusted-secret-key-123",
      { expiresIn: "1d" }
    );
  } catch (err) {
    console.error("Fixture initialization warning:", err.message);
  }
}

/**
 * Starts the Express server on an ephemeral port
 */
export async function startTestServer() {
  if (server) return { baseUrl, serverPort };

  const { default: app } = await import("../../src/index.js");

  await initializeFixtures();

  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", () => {
      serverPort = server.address().port;
      baseUrl = `http://127.0.0.1:${serverPort}`;
      resolve();
    });
    server.on("error", reject);
  });

  return { baseUrl, serverPort };
}

/**
 * Gracefully shuts down the test server
 */
export async function stopTestServer() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }
}

/**
 * Universal HTTP request function with full logging and assertions support
 */
export async function makeRequest(method, path, options = {}) {
  if (!server) {
    await startTestServer();
  }

  const {
    headers = {},
    body = null,
    token = null,
    params = null,
    suite = "Test Suite",
    testName = `${method} ${path}`,
    timeout = 10000,
  } = options;

  let url = `${baseUrl}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }

  const reqHeaders = { ...headers };
  if (token) {
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }

  let finalBody = body;
  if (body !== null && body !== undefined && typeof body === "object" && !(body instanceof Buffer)) {
    if (!reqHeaders["Content-Type"]) {
      reqHeaders["Content-Type"] = "application/json";
    }
    if (reqHeaders["Content-Type"].includes("application/json")) {
      finalBody = JSON.stringify(body);
    }
  }

  TestLogger.logRequest({
    suite,
    testName,
    method,
    url,
    headers: reqHeaders,
    body,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const start = Date.now();
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: ["GET", "HEAD"].includes(method.toUpperCase()) ? undefined : finalBody,
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - start;
    TestLogger.logResponse({
      suite,
      testName,
      method,
      url,
      statusCode: 0,
      latencyMs,
      headers: {},
      body: `FETCH_ERROR: ${fetchErr.message}`,
    });
    throw fetchErr;
  } finally {
    clearTimeout(timeoutId);
  }

  const latencyMs = Date.now() - start;
  const rawText = await response.text();

  let json = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      json = JSON.parse(rawText);
    } catch {
      json = null;
    }
  }

  TestLogger.logResponse({
    suite,
    testName,
    method,
    url,
    statusCode: response.status,
    latencyMs,
    headers: Object.fromEntries(response.headers.entries()),
    body: json || rawText,
  });

  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    body: json || rawText,
    json,
    rawText,
    latencyMs,
  };
}
