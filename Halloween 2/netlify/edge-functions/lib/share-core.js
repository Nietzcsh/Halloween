// Link previews for the GC.
// Messenger doesn't run JavaScript, so for /s/<id> we answer with plain HTML that
// carries Open Graph tags (title, description, image) for that specific nudge,
// then send real people on to the app.
//
// Data lives in Firestore at shares/<id> and is read through the public REST API.
// Firestore rules allow anyone to GET a single share by its (unguessable) id, nothing else.

const ID_RE = /^[A-Za-z0-9]{10,40}$/;
const PATH_RE = /^\/[A-Za-z0-9/_-]*$/;

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Turn Firestore REST "fields" into a plain object (strings, numbers, booleans only). */
export function fromFields(fields = {}) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if ('stringValue' in v) out[k] = v.stringValue;
    else if ('integerValue' in v) out[k] = Number(v.integerValue);
    else if ('doubleValue' in v) out[k] = v.doubleValue;
    else if ('booleanValue' in v) out[k] = v.booleanValue;
  }
  return out;
}

async function loadShare(id, env, fetchImpl) {
  const project = env('VITE_FIREBASE_PROJECT_ID');
  const key = env('VITE_FIREBASE_API_KEY');
  if (!project) return null;
  const url =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}` +
    `/databases/(default)/documents/shares/${id}${key ? `?key=${encodeURIComponent(key)}` : ''}`;
  const res = await fetchImpl(url);
  if (!res.ok) return null;
  const json = await res.json();
  return fromFields(json.fields);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function renderPage(share, { origin, id }) {
  const target = PATH_RE.test(share.path || '') && !String(share.path).startsWith('//') ? share.path : '/';
  const title = share.title || "Rory's Halloween Kemerut";
  const desc = share.description || 'Budget, hatian and polls for the Oct 31 club night.';
  const image = `${origin}/s/${id}/image.jpg`;
  const pageUrl = `${origin}/s/${id}`;
  const dest = `${origin}${target}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Rory's Halloween Kemerut">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:url" content="${escapeHtml(pageUrl)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:secure_url" content="${escapeHtml(image)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escapeHtml(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<meta name="theme-color" content="#0e0b14">
<meta http-equiv="refresh" content="0;url=${escapeHtml(dest)}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e0b14;color:#f2e8da;font:600 18px system-ui,sans-serif}a{color:#ff8a3d}</style>
</head>
<body>
<p>🎃 Opening the kemerut… <a href="${escapeHtml(dest)}">Tap here</a> if nothing happens.</p>
<script>location.replace(${JSON.stringify(dest)});</script>
</body>
</html>`;
}

/**
 * Handles /s/<id> and /s/<id>/image.jpg.
 * env(name) returns an environment variable; fetchImpl is fetch (swappable for tests).
 */
export async function handleShare(request, { env, fetchImpl = fetch }) {
  const url = new URL(request.url);
  const [, id, sub] = url.pathname.split('/').filter(Boolean);
  const home = new URL('/', url).toString();

  if (!id || !ID_RE.test(id)) return Response.redirect(home, 302);

  let share = null;
  try {
    share = await loadShare(id, env, fetchImpl);
  } catch {
    share = null;
  }

  if (sub === 'image.jpg') {
    const m = /^data:image\/(jpeg|png);base64,(.+)$/.exec(share?.image || '');
    if (!m) return new Response('Not found', { status: 404 });
    return new Response(base64ToBytes(m[2]), {
      headers: {
        'content-type': `image/${m[1]}`,
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  }

  if (!share) return Response.redirect(home, 302);

  return new Response(renderPage(share, { origin: url.origin, id }), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}
