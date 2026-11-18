/**
 * Masks IP address to preserve privacy for non-admin viewers.
 * Masks last octet of IPv4 and lower segments of IPv6.
 *
 * @param {string} ip - Raw IP string.
 * @returns {string} Masked IP string.
 */
export function maskIp(ip) {
  if (!ip || typeof ip !== "string") {
    return "xxx.xxx.xxx.xxx";
  }

  const cleanIp = ip.trim();

  // IPv4 or IPv4-mapped IPv6 (e.g., "::ffff:192.168.1.50")
  if (cleanIp.includes(".")) {
    const parts = cleanIp.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }

  // IPv6
  if (cleanIp.includes(":")) {
    const segments = cleanIp.split(":");
    if (segments.length >= 4) {
      return `${segments.slice(0, 3).join(":")}::xxxx`;
    }
    return "xxxx:xxxx::xxxx";
  }

  return "xxx.xxx.xxx.xxx";
}
