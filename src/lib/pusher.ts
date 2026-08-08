import Pusher from 'pusher-js';

let client: Pusher | null = null;

/**
 * Returns a singleton Pusher client.
 * Lazy-initialized so it never runs during SSR / static build
 * (NEXT_PUBLIC_ vars are not available at build time on Vercel unless explicitly set).
 */
export function getPusherClient(): Pusher {
  if (client) return client;

  const key     = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) {
    throw new Error(
      'Missing NEXT_PUBLIC_PUSHER_KEY or NEXT_PUBLIC_PUSHER_CLUSTER. ' +
      'Add them to your Vercel project → Settings → Environment Variables.'
    );
  }

  client = new Pusher(key, { cluster });
  return client;
}