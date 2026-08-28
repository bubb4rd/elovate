/**
 * Public site origin for auth redirects.
 * On Netlify, `request.url` can be the deploy subdomain (`{id}--site.netlify.app`),
 * which breaks host-only session cookies if used in Location headers.
 */
export function publicOrigin(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL;
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      /* ignore invalid env */
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.split(",")[0]?.trim();
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";

  if (host) {
    const productionHost = host.replace(/^[a-z0-9]+--/i, "");
    return `${proto}://${productionHost}`;
  }

  return new URL(request.url).origin;
}
