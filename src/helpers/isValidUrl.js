/**
 * Enhanced URL validator that checks for valid URL structure and common patterns
 * @param {string} str - String to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.requireProtocol - Whether to require http:// or https:// (default: true)
 * @param {boolean} options.allowLocalhost - Whether to allow localhost URLs (default: true)
 * @param {boolean} options.allowIp - Whether to allow IP addresses (default: true)
 * @param {string[]} options.allowedProtocols - List of allowed protocols (default: ['http:', 'https:'])
 * @returns {boolean}
 */
function isValidUrl(str, options = {}) {
  const {
    requireProtocol = true,
    allowLocalhost = true,
    allowIp = true,
    allowedProtocols = ["http:", "https:"],
  } = options;

  // Early validation
  if (!str || typeof str !== "string") return false;

  // Trim whitespace
  str = str.trim();

  // Add protocol if missing and not required
  if (!requireProtocol && !str.includes("://")) {
    str = "https://" + str;
  }

  let url;
  try {
    url = new URL(str);
  } catch {
    return false;
  }

  // Protocol validation
  if (!allowedProtocols.includes(url.protocol)) {
    return false;
  }

  // Hostname validation
  const hostname = url.hostname;

  // Check for empty hostname
  if (!hostname) return false;

  // Localhost validation
  if (
    !allowLocalhost &&
    (hostname === "localhost" ||
      hostname.startsWith("127.") ||
      hostname === "[::1]")
  ) {
    return false;
  }

  // IP address validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;
  const isIp =
    ipv4Regex.test(hostname) || ipv6Regex.test(hostname.replace(/^\[|]$/g, ""));

  if (isIp && !allowIp) {
    return false;
  }

  // Domain name validation
  if (!isIp && !hostname.includes("localhost")) {
    // Check for valid domain name format
    const domainRegex = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(hostname)) {
      return false;
    }

    // Check for valid domain segments
    const segments = hostname.split(".");
    for (const segment of segments) {
      // Check segment length and invalid characters
      if (
        segment.length > 63 ||
        segment.startsWith("-") ||
        segment.endsWith("-")
      ) {
        return false;
      }
    }
  }

  return true;
}

module.exports = isValidUrl;
