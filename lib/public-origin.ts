const DEFAULT_PUBLIC_ORIGIN = "https://simple-date-asking-website.vercel.app";

const TRUSTED_PUBLIC_ORIGINS = new Set([
  DEFAULT_PUBLIC_ORIGIN,
  "https://wybmd.frgagz.com",
  "https://wybmd.cntest.uk",
]);

export function getTrustedPublicOrigin(request: Request) {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  const requestHost = (() => {
    try {
      return new URL(request.url).host.toLowerCase();
    } catch {
      return null;
    }
  })();

  for (const host of [forwardedHost, requestHost]) {
    if (!host) continue;
    const candidate = `https://${host}`;
    if (TRUSTED_PUBLIC_ORIGINS.has(candidate)) return candidate;
  }

  return DEFAULT_PUBLIC_ORIGIN;
}
