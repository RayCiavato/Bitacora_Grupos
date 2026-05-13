const net = require("net");
const { config } = require("../config");

function normalizeIp(value) {
  const raw = String(value || "").trim().split(",")[0].trim();
  if (!raw) {
    return "";
  }
  if (raw.startsWith("::ffff:")) {
    return raw.slice("::ffff:".length);
  }
  return raw;
}

function ipToNumber(ip) {
  const normalized = normalizeIp(ip);
  if (net.isIP(normalized) !== 4) {
    return null;
  }
  return normalized.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function parseCidr(cidr) {
  const raw = String(cidr || "").trim();
  if (!raw) {
    return null;
  }
  const [baseIp, prefixRaw = "32"] = raw.split("/");
  const base = ipToNumber(baseIp);
  const prefix = Number(prefixRaw);
  if (base === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return null;
  }
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return {
    base: base & mask,
    mask,
    prefix
  };
}

function getClientIp(req) {
  const forwardedFor = req?.headers?.["x-forwarded-for"];
  return normalizeIp(forwardedFor || req?.ip || req?.socket?.remoteAddress || "");
}

function isIpAllowed(ip, allowedNetworks = config.allowedNetworks) {
  const numericIp = ipToNumber(ip);
  if (numericIp === null) {
    return false;
  }

  const networks = (Array.isArray(allowedNetworks) ? allowedNetworks : [])
    .map(parseCidr)
    .filter(Boolean);

  return networks.some((network) => (numericIp & network.mask) === network.base);
}

function isRequestFromAllowedNetwork(req) {
  if (!config.internalNetworkOnly) {
    return true;
  }
  return isIpAllowed(getClientIp(req));
}

module.exports = {
  getClientIp,
  isIpAllowed,
  isRequestFromAllowedNetwork,
  normalizeIp,
  parseCidr
};
