import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.resolve(__dirname, "../logs");
const logFilePath = path.join(logDir, "test-execution.log");

// Ensure logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Reset log file at the start of a test run
fs.writeFileSync(
  logFilePath,
  `=== GATEZEN BACKEND TEST RUN LOG - ${new Date().toISOString()} ===\n\n`,
  "utf8"
);

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

export class TestLogger {
  static sanitizeHeaders(headers = {}) {
    const sanitized = { ...headers };
    if (sanitized.authorization || sanitized.Authorization) {
      const auth = sanitized.authorization || sanitized.Authorization;
      if (typeof auth === "string" && auth.startsWith("Bearer ")) {
        sanitized.authorization = `Bearer ${auth.slice(7, 18)}...[len=${auth.length}]`;
        delete sanitized.Authorization;
      }
    }
    if (sanitized["x-cron-secret"]) sanitized["x-cron-secret"] = "[REDACTED]";
    if (sanitized["x-setup-secret"]) sanitized["x-setup-secret"] = "[REDACTED]";
    return sanitized;
  }

  static logRequest({
    suite = "Test",
    testName = "Endpoint Call",
    method,
    url,
    headers = {},
    body = null,
  }) {
    const timestamp = new Date().toISOString();
    const cleanHeaders = this.sanitizeHeaders(headers);
    const bodyStr = body !== null && body !== undefined
      ? (typeof body === "string" ? body : JSON.stringify(body, null, 2))
      : "<empty>";

    const fileEntry = [
      `--------------------------------------------------------------------------------`,
      `[REQ] ${timestamp} | [${suite}] ${testName}`,
      `METHOD: ${method} | URL: ${url}`,
      `HEADERS: ${JSON.stringify(cleanHeaders)}`,
      `BODY: ${bodyStr}`,
      ``,
    ].join("\n");

    try {
      fs.appendFileSync(logFilePath, fileEntry, "utf8");
    } catch (e) {
      // Ignore disk append errors in high concurrency
    }

    const consoleSummary = `${colors.cyan}[${suite}]${colors.reset} ${colors.yellow}${method}${colors.reset} ${url} ${colors.gray}-> Request sent${colors.reset}`;
    console.log(consoleSummary);
  }

  static logResponse({
    suite = "Test",
    testName = "Endpoint Call",
    method,
    url,
    statusCode,
    latencyMs = 0,
    headers = {},
    body = null,
  }) {
    const timestamp = new Date().toISOString();
    const isSuccess = statusCode >= 200 && statusCode < 400;
    const isClientErr = statusCode >= 400 && statusCode < 500;
    const statusColor = isSuccess ? colors.green : (isClientErr ? colors.yellow : colors.red);

    const bodyPreview = body !== null && body !== undefined
      ? (typeof body === "string" ? body.slice(0, 1000) : JSON.stringify(body, null, 2).slice(0, 1000))
      : "<empty>";

    const fileEntry = [
      `[RES] ${timestamp} | [${suite}] ${testName}`,
      `STATUS: ${statusCode} | LATENCY: ${latencyMs}ms`,
      `BODY PREVIEW:\n${bodyPreview}`,
      `--------------------------------------------------------------------------------\n`,
    ].join("\n");

    try {
      fs.appendFileSync(logFilePath, fileEntry, "utf8");
    } catch (e) {
      // Ignore disk append errors
    }

    const consoleSummary = `      ${statusColor}${statusCode}${colors.reset} in ${latencyMs}ms | Preview: ${typeof body === "object" ? JSON.stringify(body).slice(0, 120) : String(body).slice(0, 120)}`;
    console.log(consoleSummary);
  }

  static logSection(sectionTitle) {
    const border = "=".repeat(70);
    const text = `\n${border}\n  ${sectionTitle}\n${border}\n`;
    try {
      fs.appendFileSync(logFilePath, text, "utf8");
    } catch {}
    console.log(`\n${colors.bright}${colors.blue}${border}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}  >>> ${sectionTitle} <<<${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}${border}${colors.reset}\n`);
  }

  static logBugObserved({ bugId, description, endpoint, status, response }) {
    const text = `\n[KNOWN BUG TRIGGERED: ${bugId}]\nENDPOINT: ${endpoint}\nDESC: ${description}\nSTATUS: ${status}\nRESPONSE: ${JSON.stringify(response)}\n`;
    try {
      fs.appendFileSync(logFilePath, text, "utf8");
    } catch {}
    console.log(`\n${colors.magenta}⚠️  [BUG DETECTED: ${bugId}] ${description}${colors.reset}`);
    console.log(`    Endpoint: ${endpoint} | Status: ${status}\n`);
  }
}
