import crypto from "crypto";

/**
 * Generate a device fingerprint from request headers and user agent
 * @param {Object} req - Express request object
 * @returns {string} - Device fingerprint hash
 */
export function generateDeviceFingerprint(req) {
  // Safely access headers with fallback
  const headers = req?.headers || {};
  const userAgent = headers["user-agent"] || "";
  const acceptLanguage = headers["accept-language"] || "";
  const acceptEncoding = headers["accept-encoding"] || "";
  const connection = headers["connection"] || "";
  
  // Get screen resolution if available (from frontend)
  const body = req?.body || {};
  const screenResolution = body.screenResolution || headers["x-screen-resolution"] || "";
  
  // Get timezone if available (from frontend)
  const timezone = body.timezone || headers["x-timezone"] || "";
  
  // Combine all device characteristics
  const deviceString = [
    userAgent,
    acceptLanguage,
    acceptEncoding,
    connection,
    screenResolution,
    timezone,
  ].join("|");
  
  // Generate SHA-256 hash
  return crypto.createHash("sha256").update(deviceString).digest("hex");
}

/**
 * Extract device information from user agent
 * @param {string} userAgent - User agent string
 * @returns {Object} - Device information
 */
export function parseDeviceInfo(userAgent) {
  const ua = userAgent || "";
  
  // Simple browser detection
  let browser = "Unknown";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
  
  // Simple OS detection
  let os = "Unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X") || ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  
  // Platform
  let platform = "Desktop";
  if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone") || ua.includes("iPad")) {
    platform = "Mobile";
  } else if (ua.includes("Tablet")) {
    platform = "Tablet";
  }
  
  return {
    browser,
    os,
    platform,
    userAgent: ua.substring(0, 200), // Limit length
  };
}

/**
 * Generate a cryptographically secure device token
 * @returns {string} - Random device token
 */
export function generateDeviceToken() {
  return crypto.randomBytes(32).toString("hex");
}

