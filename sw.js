const CACHE = 'sw-test-precache-v1';

self.addEventListener('install', (event) => {
	event.waitUntil((async () => {
		const cache = await caches.open(CACHE);

		// Precache core assets using relative paths for GitHub Pages subpaths
		await cache.addAll(['./', './index.html', ]);
	})());
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil((async () => {
		// Cleanup old caches if version changes
		const keys = await caches.keys();
		await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
		await self.clients.claim();
	})());
});

// Helper to post logs back to all controlled clients
async function broadcast(message) {
	const clientsList = await self.clients.matchAll({
		includeUncontrolled: true,
		type: 'window'
	});
	for (const client of clientsList) {
		client.postMessage(message);
	}
}

self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// 1) Synthetic route to prove SW fetch intercepts
	if (url.pathname.endsWith('/intercept-test')) {
		event.respondWith((async () => {
			const body = JSON.stringify({
				fromServiceWorker: true,
				ts: Date.now(),
				url: url.href,
			});
			broadcast({
				type: 'intercept',
				url: url.href,
				ts: Date.now()
			});
			return new Response(body, {
				headers: {
					'Content-Type': 'application/json'
				}
			});
		})());
		return;
	}

	// 2) Navigation requests: try cache first (offline), fallback to network
	if (event.request.mode === 'navigate') {
		event.respondWith((async () => {
			const cache = await caches.open(CACHE);
			const cached = await cache.match('./index.html');
			if (cached) return cached;
			try {
				const res = await fetch(event.request);
				return res;
			} catch (e) {
				return new Response('<h1>Offline</h1>', {
					headers: {
						'Content-Type': 'text/html'
					},
					status: 200
				});
			}
		})());
		return;
	}

	// 3) Default: network-first, then cache fallback (optional)
	event.respondWith((async () => {
		try {
			const net = await fetch(event.request);
			return net;
		} catch (e) {
			const cache = await caches.open(CACHE);
			const cached = await cache.match(event.request);
			if (cached) return cached;
			throw e;
		}
	})());
});