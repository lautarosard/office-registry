/**
 * Value for Express "trust proxy", which decides what `req.ip` is, and with it
 * who the login rate limit counts.
 *
 *   "1"        behind exactly one reverse proxy (Nginx): use the address it
 *              put in X-Forwarded-For
 *   "false"    no proxy: ignore the header, which any client can forge
 *   addresses  comma-separated IPs / subnets of the trusted proxies
 *
 * Unset: 1 in production (the compose file puts Nginx in front), else false.
 * "true" is rejected: it would let every client choose its own address.
 */
export function parseTrustProxy(
  value: string | undefined,
  nodeEnv: string,
): number | false | string {
  const setting = value?.trim() || (nodeEnv === 'production' ? '1' : 'false');

  if (setting.toLowerCase() === 'false') return false;
  if (/^\d+$/.test(setting)) return Number(setting) || false;
  return setting;
}
