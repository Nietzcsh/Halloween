// Netlify Edge Function: serves link previews for /s/<id> (see lib/share-core.js).
// Uses the same VITE_FIREBASE_* environment variables you already set in Netlify.
import { handleShare } from './lib/share-core.js';

export default (request) => handleShare(request, { env: (name) => Netlify.env.get(name) });

export const config = { path: ['/s/*'] };
