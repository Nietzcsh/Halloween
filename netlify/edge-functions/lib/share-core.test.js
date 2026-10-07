// Run with: npm test  (Node 18+, no extra packages)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleShare, escapeHtml } from './share-core.js';

const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const SHARE = {
  title: { stringValue: '📣 Paalala: Airbnb <Poblacion>' },
  description: { stringValue: 'Hindi pa bayad: Ana, Ben. ₱923.08 each.' },
  path: { stringValue: '/budget' },
  image: { stringValue: `data:image/png;base64,${PNG_1PX}` },
};

function fakeFetch(calls) {
  return async (url) => {
    calls.push(url);
    if (url.includes('/shares/AbCdEf123456')) return new Response(JSON.stringify({ fields: SHARE }), { status: 200 });
    return new Response('{}', { status: 404 });
  };
}
const env = (k) => ({ VITE_FIREBASE_PROJECT_ID: 'kemerut-demo', VITE_FIREBASE_API_KEY: 'key123' })[k];

test('page has Open Graph tags and redirects to the app', async () => {
  const calls = [];
  const res = await handleShare(new Request('https://rory.netlify.app/s/AbCdEf123456'), { env, fetchImpl: fakeFetch(calls) });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<meta property="og:title" content="📣 Paalala: Airbnb &lt;Poblacion&gt;">/);
  assert.match(html, /og:image" content="https:\/\/rory\.netlify\.app\/s\/AbCdEf123456\/image\.jpg"/);
  assert.match(html, /location\.replace\("https:\/\/rory\.netlify\.app\/budget"\)/);
  assert.match(calls[0], /projects\/kemerut-demo\/databases\/\(default\)\/documents\/shares\/AbCdEf123456\?key=key123/);
});

test('image route returns the stored picture', async () => {
  const res = await handleShare(new Request('https://rory.netlify.app/s/AbCdEf123456/image.jpg'), { env, fetchImpl: fakeFetch([]) });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/png');
  const bytes = new Uint8Array(await res.arrayBuffer());
  assert.deepEqual([...bytes.slice(1, 4)], [80, 78, 71]); // "PNG"
});

test('unknown or malformed ids go to the home page', async () => {
  const a = await handleShare(new Request('https://rory.netlify.app/s/doesNotExist99'), { env, fetchImpl: fakeFetch([]) });
  assert.equal(a.status, 302);
  assert.equal(a.headers.get('location'), 'https://rory.netlify.app/');
  const b = await handleShare(new Request('https://rory.netlify.app/s/../etc'), { env, fetchImpl: fakeFetch([]) });
  assert.equal(b.status, 302);
});

test('a bad redirect path falls back to home', async () => {
  const evil = { ...SHARE, path: { stringValue: '//evil.example.com' } };
  const res = await handleShare(new Request('https://rory.netlify.app/s/AbCdEf123456'), {
    env,
    fetchImpl: async () => new Response(JSON.stringify({ fields: evil }), { status: 200 }),
  });
  const html = await res.text();
  assert.match(html, /location\.replace\("https:\/\/rory\.netlify\.app\/"\)/);
});

test('escapeHtml', () => {
  assert.equal(escapeHtml(`<a href="x">'&`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
});
