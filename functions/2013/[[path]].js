export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // ===== Timestamp (2013 + current time) =====
  const now = new Date();
  const timestamp =
    "2013" +
    String(now.getUTCMonth() + 1).padStart(2, "0") +
    String(now.getUTCDate()).padStart(2, "0") +
    String(now.getUTCHours()).padStart(2, "0") +
    String(now.getUTCMinutes()).padStart(2, "0") +
    String(now.getUTCSeconds()).padStart(2, "0");

  // ===== Strip base path =====
  const base = "/mirrortube/2013";
  let path = url.pathname.startsWith(base)
    ? url.pathname.slice(base.length)
    : url.pathname;

  if (!path || path === "/") path = "";

  // ===== Target URL =====
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
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "fetch failed", target }),
      { status: 500 }
    );
  }

  // ===== Headers =====
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
    `
      .replace(/\s+/g, " ")
      .trim()
  );

  headers.set("access-control-allow-origin", "*");

  const contentType = headers.get("content-type") || "";

  // ===== HTML rewriting =====
  if (contentType.includes("text/html")) {
    let text = await res.text();

    // 🔥 Remove Wayback UI
    text = text.replace(/<div id="wm-ipp".*?<\/div>/gis, "");
    text = text.replace(/<script[^>]*archive\.org[^>]*><\/script>/gi, "");

    // 🔁 Rewrite Wayback absolute URLs
    text = text.replace(
      /https:\/\/web\.archive\.org\/web\/\d+id_\/http:\/\/www\.youtube\.com/gi,
      "/mirrortube/2013"
    );

    text = text.replace(
      /\/\/web\.archive\.org\/web\/\d+id_\/http:\/\/www\.youtube\.com/gi,
      "/mirrortube/2013"
    );

    // 🔁 Rewrite direct YouTube links
    text = text.replace(
      /https?:\/\/www\.youtube\.com/gi,
      "/mirrortube/2013"
    );
// 🔥 Force http:// assets → Wayback HTTPS
text = text.replace(
  /(["'=])http:\/\/([^"'\s]+)/gi,
  `$1https://web.archive.org/web/${timestamp}id_/http://$2`
);
    // 🔥 FIX protocol-relative URLs (//ytimg, etc.)
    text = text.replace(
      /(["'=])\/\/([^"'\s]+)/gi,
      `$1https://web.archive.org/web/${timestamp}id_/http://$2`
    );

    // 🔁 Fix root-relative paths
    text = text.replace(/href="\//gi, 'href="/mirrortube/2013/');
    text = text.replace(/src="\//gi, 'src="/mirrortube/2013/');
    
    // 🔥 Replace ANY .swf URL with your custom player
text = text.replace(
  /https?:\/\/[^"'\s]+\.swf/gi,
  "https://file.garden/aUYIWVAKvQxCBY-_/database/swf/watch_as3-vflMmYdk4.swf"
);

// also catch protocol-relative
text = text.replace(
  /\/\/[^"'\s]+\.swf/gi,
  "https://file.garden/aUYIWVAKvQxCBY-_/database/swf/watch_as3-vflMmYdk4.swf"
);
// 🔥 Force all .swf requests to your file
if (url.pathname.endsWith(".swf")) {
  return fetch(
    "https://file.garden/aUYIWVAKvQxCBY-_/database/swf/watch_as3-vflMmYdk4.swf"
  );
}
    // 🔥 Force all SWF requests to your custom player
if (url.pathname.toLowerCase().endsWith(".swf")) {
  return fetch(
    "https://file.garden/aUYIWVAKvQxCBY-_/database/swf/watch_as3-vflMmYdk4.swf",
    {
      headers: {
        "User-Agent":
          request.headers.get("user-agent") || "Mozilla/5.0",
      },
    }
  );
}
    // a bulletproof one ig
const fullUrl = url.pathname + url.search;

if (/\.swf(\?|$)/i.test(fullUrl)) {
  return fetch(
    "https://file.garden/aUYIWVAKvQxCBY-_/database/swf/watch_as3-vflMmYdk4.swf",
    {
      headers: {
        "User-Agent":
          request.headers.get("user-agent") || "Mozilla/5.0",
      },
    }
  );
}
    return new Response(text, {
      status: res.status,
      headers,
    });
  }

  // ===== Non-HTML =====
  return new Response(res.body, {
    status: res.status,
    headers,
  });
}
