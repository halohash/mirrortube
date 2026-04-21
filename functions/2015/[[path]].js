export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const origin = url.origin;

  const match = url.pathname.match(/^\/(\d{4})(\/|$)/);
  const year = match ? match[1] : "2015";

  const MIRROR_BASE = origin + "/" + year;

  const fullUrl = url.pathname + url.search;
  if (/\.swf(\?|$)/i.test(fullUrl)) {
    return fetch(
      "https://file.garden/aUYIWVAKvQxCBY-_/database/swf/watch_as3-vflMmYdk4.swf"
    );
  }

  const now = new Date();
  const timestamp =
    year +
    String(now.getUTCMonth() + 1).padStart(2, "0") +
    String(now.getUTCDate()).padStart(2, "0") +
    String(now.getUTCHours()).padStart(2, "0") +
    String(now.getUTCMinutes()).padStart(2, "0") +
    String(now.getUTCSeconds()).padStart(2, "0");

  const base = "/" + year;
  let path = url.pathname.startsWith(base)
    ? url.pathname.slice(base.length)
    : url.pathname;

  if (!path || path === "/") path = "";

  const target =
    `https://web.archive.org/web/${timestamp}id_/http://www.youtube.com` +
    path +
    url.search;

  let res;
  try {
    res = await fetch(target, {
      headers: {
        "User-Agent":
          request.headers.get("user-agent") || "Mozilla/5.0",
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "fetch failed", target }),
      { status: 500 }
    );
  }

  const headers = new Headers(res.headers);

  headers.delete("content-security-policy");
  headers.delete("content-security-policy-report-only");
  headers.delete("x-frame-options");
  headers.delete("x-content-type-options");

  headers.set(
    "content-security-policy",
    `
    default-src * data: blob: 'unsafe-inline' 'unsafe-eval';
    script-src * data: blob: 'unsafe-inline' 'unsafe-eval';
    style-src * data: blob: 'unsafe-inline';
    img-src * data: blob:;
    frame-src *;
    connect-src *;
    media-src *;
    font-src * data:;
    `.replace(/\s+/g, " ").trim()
  );

  headers.set("access-control-allow-origin", "*");

  const contentType = headers.get("content-type") || "";

  if (contentType.includes("text/html")) {
    let text = await res.text();

    text = text.replace(/<div id="wm-ipp".*?<\/div>/gis, "");
    text = text.replace(/<script[^>]*archive\.org[^>]*><\/script>/gi, "");

    text = text.replace(
      /(href|action)=["']https:\/\/web\.archive\.org\/web\/\d+id_\/http:\/\/www\.youtube\.com/gi,
      `$1="${MIRROR_BASE}`
    );

    text = text.replace(
      /(href|action)=["']https?:\/\/www\.youtube\.com/gi,
      `$1="${MIRROR_BASE}`
    );

    text = text.replace(
      /(["'=])http:\/\/([^"'\s]+)/gi,
      `$1https://web.archive.org/web/${timestamp}id_/http://$2`
    );

    text = text.replace(
      /(["'=])\/\/([^"'\s]+)/gi,
      `$1https://web.archive.org/web/${timestamp}id_/http://$2`
    );

    text = text.replace(
      /https?:\/\/[^"'\s]+\.swf/gi,
      "https://file.garden/aUYIWVAKvQxCBY-_/database/swf/watch_as3-vflMmYdk4.swf"
    );

    text = text.replace(
      /\/\/[^"'\s]+\.swf/gi,
      "https://file.garden/aUYIWVAKvQxCBY-_/database/swf/watch_as3-vflMmYdk4.swf"
    );

    text = text.replace(/href="\//gi, `href="${MIRROR_BASE}/`);
    text = text.replace(/src="\//gi, `src="${MIRROR_BASE}/`);

    text = text.replace(
      /action="\/([^"]*)"/gi,
      `action="${MIRROR_BASE}/$1"`
    );

    text = text.replace(
      /<head>/i,
      `<head><base href="${MIRROR_BASE}/">`
    );

    return new Response(text, {
      status: res.status,
      headers,
    });
  }

  if (contentType.includes("javascript")) {
    let text = await res.text();

    text = text.replace(
      /http:\/\/([^"'\s]+)/gi,
      `https://web.archive.org/web/${timestamp}id_/http://$1`
    );

    text = text.replace(
      /(["'=])\/\/([^"'\s]+)/gi,
      `$1https://web.archive.org/web/${timestamp}id_/http://$2`
    );

    return new Response(text, {
      status: res.status,
      headers,
    });
  }

  if (contentType.includes("text/css")) {
    let text = await res.text();

    text = text.replace(
      /url\((['"]?)http:\/\/([^'")]+)\1\)/gi,
      `url($1https://web.archive.org/web/${timestamp}id_/http://$2$1)`
    );

    text = text.replace(
      /url\((['"]?)\/\/([^'")]+)\1\)/gi,
      `url($1https://web.archive.org/web/${timestamp}id_/http://$2$1)`
    );

    return new Response(text, {
      status: res.status,
      headers,
    });
  }

  return new Response(res.body, {
    status: res.status,
    headers,
  });
}