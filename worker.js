const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self' https://api.web3forms.com",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "media-src 'self' https://media.pragmaticfox.com",
    "connect-src 'self' https://api.web3forms.com",
    "object-src 'none'",
  ].join('; '),
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
};

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
    const response = await env.ASSETS.fetch(request);
    return withResponseHeaders(response, url.pathname);
  },
};
