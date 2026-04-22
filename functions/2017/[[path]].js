export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const origin = url.origin;

  const match = url.pathname.match(/^\/(\d{4})(\/|$)/);
  const year = match ? match[1] : "2017";

  const MIRROR_BASE = origin + "/" + year;
  const SWF_PROXY = `/${year}/__swf_proxy`;

  if (url.pathname.startsWith(SWF_PROXY)) {
    return fetch(
      "https://file.garden/aUYIWVAKvQxCBY-_/database/swf/watch_as3-vflMmYdk4.swf" +
        url.search,
      {
        headers: {
          "User-Agent": request.headers.get("user-agent") || "Mozilla/5.0"
        }
      }
    );
  }

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
        "User-Agent": request.headers.get("user-agent") || "Mozilla/5.0"
      }
    });
  } catch {
    return new Response(JSON.stringify({ error: "fetch failed", target }), {
      status: 500
    });
  }

  const headers = new Headers(res.headers);

  headers.delete("content-security-policy");
  headers.delete("content-security-policy-report-only");
  headers.delete("x-frame-options");
  headers.delete("x-content-type-options");

  headers.set(
    "content-security-policy",
    `default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; script-src * data: blob: 'unsafe-inline' 'unsafe-eval'; style-src * data: blob: 'unsafe-inline'; img-src * data: blob:; frame-src *; connect-src *; media-src *; font-src * data:;`
  );

  headers.set("access-control-allow-origin", "*");

  const contentType = headers.get("content-type") || "";

  const YT_SWF_REGEX = /https?:\/\/[^"'\s]*ytimg\.com\/[^"'\s]*\.swf(\?[^"'\s]*)?/gi;
  const YT_SWF_REGEX_PROTO = /\/\/[^"'\s]*ytimg\.com\/[^"'\s]*\.swf(\?[^"'\s]*)?/gi;
  const WAYBACK_SWF_REGEX = /web\.archive\.org\/web\/\d+[^"'\s]*ytimg\.com\/[^"'\s]*\.swf(\?[^"'\s]*)?/gi;

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

    text = text.replace(YT_SWF_REGEX, `${MIRROR_BASE}${SWF_PROXY}$1`);
    text = text.replace(YT_SWF_REGEX_PROTO, `${MIRROR_BASE}${SWF_PROXY}$1`);
    text = text.replace(WAYBACK_SWF_REGEX, `${MIRROR_BASE}${SWF_PROXY}$1`);

    text = text.replace(
      /ytplayer\.config\s*=\s*({[\s\S]*?});/,
      (match, json) => {
        try {
          const obj = JSON.parse(json);

          if (obj.assets) {
            obj.assets.swf = `${MIRROR_BASE}/__swf_proxy`;
          }

          if (obj.url) {
            obj.url = `${MIRROR_BASE}/__swf_proxy`;
          }

          if (obj.args && obj.args.iv_module) {
            obj.args.iv_module = `${MIRROR_BASE}/__swf_proxy`;
          }

          return "ytplayer.config = " +
            JSON.stringify(obj).replace(/\\\//g, "/").replace(/\\\\/g, "\\") +
            ";";
        } catch {
          return match;
        }
      }
    );

    text = text.replace(
      /s\\u0072c=\\"http:\\/\\/s\.ytimg\.com\/[^"]+watch_as3\.swf\\"/gi,
      `src=\\"${MIRROR_BASE}/__swf_proxy\\"`
    );

    text = text.replace(
      /src="http:\/\/s\.ytimg\.com\/[^"]+watch_as3\.swf"/gi,
      `src="${MIRROR_BASE}/__swf_proxy"`
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
      headers
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

    text = text.replace(YT_SWF_REGEX, `${MIRROR_BASE}${SWF_PROXY}$1`);
    text = text.replace(WAYBACK_SWF_REGEX, `${MIRROR_BASE}${SWF_PROXY}$1`);

    text = text.replace(
      /s\\u0072c=\\"http:\\/\\/s\.ytimg\.com\/[^"]+watch_as3\.swf\\"/gi,
      `src=\\"${MIRROR_BASE}/__swf_proxy\\"`
    );

    text = text.replace(
      /src="http:\/\/s\.ytimg\.com\/[^"]+watch_as3\.swf"/gi,
      `src="${MIRROR_BASE}/__swf_proxy"`
    );

    return new Response(text, {
      status: res.status,
      headers
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
      headers
    });
  }

  return new Response(res.body, {
    status: res.status,
    headers
  });
}