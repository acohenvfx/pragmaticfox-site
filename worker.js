const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self' https://api.web3forms.com",
    "script-src 'self' 'unsafe-inline' https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://*.googleusercontent.com",
    "frame-src https://post-tools-95000.firebaseapp.com https://accounts.google.com",
    "media-src 'self' https://media.pragmaticfox.com",
    "connect-src 'self' https://api.web3forms.com https://*.googleapis.com https://*.firebaseio.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://avid-license-service-staging.andrewcohenvfx.workers.dev https://avid-license-service.andrewcohenvfx.workers.dev",
    "object-src 'none'",
  ].join('; '),
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
};

const STAGING_LICENSE_ORIGIN = "https://avid-license-service-staging.andrewcohenvfx.workers.dev";

function isLocalRequest(request) {
  // Wrangler's local worker request URL is HTTP; deployed custom-domain
  // requests are HTTPS, so this keeps the staging proxy local-only.
  return request.url.startsWith("http://");
}

async function proxyLocalLicenseRequest(request, url) {
  const upstreamPath = url.pathname.slice("/api/license".length) || "/";
  const upstreamUrl = `${STAGING_LICENSE_ORIGIN}${upstreamPath}${url.search}`;
  const headers = new Headers(request.headers);
  // The staging worker uses Origin only for browser CORS. A same-origin local
  // proxy must omit it so the upstream request is not rejected as an unknown
  // local origin.
  headers.delete("origin");
  headers.delete("host");
  const init = {
    method: request.method,
    headers,
    redirect: "follow",
  };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body;
  return fetch(upstreamUrl, init);
}

function withResponseHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  Object.entries(SECURITY_HEADERS).forEach(([name, value]) => headers.set(name, value));

  if (response.ok) {
    if (/\.(?:css|js)$/i.test(pathname)) {
      headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    } else if (/\.(?:png|jpg|jpeg|webp|avif|svg|ico)$/i.test(pathname)) {
      headers.set("Cache-Control", "public, max-age=604800, stale-while-revalidate=2592000");
    } else if (/\.mp4$/i.test(pathname)) {
      headers.set("Cache-Control", "public, max-age=604800, stale-while-revalidate=2592000");
    } else {
      headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const shouldProxy = isLocalRequest(request) && url.pathname.startsWith("/api/license");
    const response = shouldProxy
      ? await proxyLocalLicenseRequest(request, url)
      : await env.ASSETS.fetch(request);
    const wrapped = withResponseHeaders(response, url.pathname);
    return wrapped;
  },
};
