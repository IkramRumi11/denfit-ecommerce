import dns from 'dns/promises';
import net from 'net';

const PRIVATE_IPV4_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  { start: '127.0.0.0', end: '127.255.255.255' },
  { start: '169.254.0.0', end: '169.254.255.255' },
  { start: '0.0.0.0', end: '0.255.255.255' },
];

const toIPv4Long = (ip) => {
  if (!net.isIP(ip)) return null;
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
  return parts[0] * 256 ** 3 + parts[1] * 256 ** 2 + parts[2] * 256 + parts[3];
};

const toIPv6BigInt = (ip) => {
  if (!net.isIP(ip) || net.isIP(ip) !== 6) return null;
  const normalized = ip.includes('::') ? ip : `${ip}`;
  const parts = normalized.split(':');
  const full = [];
  let missing = 8 - parts.length;
  for (const part of parts) {
    if (part === '') {
      for (let i = 0; i < missing; i += 1) full.push('0');
      continue;
    }
    full.push(part.padStart(4, '0'));
  }
  let value = 0n;
  for (const part of full) {
    value = (value << 16n) | BigInt(parseInt(part, 16));
  }
  return value;
};

export const isPrivateIP = (ip) => {
  if (!ip) return false;
  if (net.isIP(ip) === 4) {
    const long = toIPv4Long(ip);
    if (long === null) return false;
    return PRIVATE_IPV4_RANGES.some(({ start, end }) => {
      const startLong = toIPv4Long(start);
      const endLong = toIPv4Long(end);
      return startLong !== null && endLong !== null && long >= startLong && long <= endLong;
    });
  }

  if (net.isIP(ip) === 6) {
    const value = toIPv6BigInt(ip);
    if (value === null) return false;
    return value === 0n || value === 1n || (value >= 0xfc000000000000000000000000000000n && value <= 0xfdffffffffffffffffffffffffffffn);
  }

  return false;
};

export const assertUrlSafe = async (urlString) => {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch (error) {
    throw new Error('Invalid URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Unsupported URL protocol: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname;
  if (!hostname) {
    throw new Error('URL is missing a hostname');
  }

  const blockedHostnames = ['localhost', '127.0.0.1', '::1', '0.0.0.0', '169.254.169.254'];
  if (blockedHostnames.includes(hostname)) {
    throw new Error(`Blocked hostname: ${hostname}`);
  }

  const records = await dns.lookup(hostname, { all: true, family: 0 }).catch(() => []);
  if (!records.length) {
    throw new Error(`Unable to resolve hostname: ${hostname}`);
  }

  const blocked = records.find((record) => isPrivateIP(record.address));
  if (blocked) {
    throw new Error(`Blocked private/internal IP address: ${blocked.address}`);
  }

  return true;
};

export default { assertUrlSafe, isPrivateIP };
