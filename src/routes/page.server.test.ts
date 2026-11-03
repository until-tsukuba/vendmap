import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import * as v from 'valibot';
import vm from '$lib/assets/vm.json';
import { geoJSONRoot } from '$lib/geojson';
import { load } from './+page.server';

const NOW = Date.parse('2026-11-03T15:00:00Z');
const SIX_HOURS = 6 * 60 * 60 * 1000;
const CACHE_KEY = 'https://vendmap.tsukuba.dev/__cache/overpass/vending-machines';
const ENDPOINTS = [
	'https://overpass-api.de/api/interpreter',
	'https://overpass.private.coffee/api/interpreter'
];
const PAGE_CACHE_CONTROL = 'max-age=43200, public, s-maxage=300, stale-while-revalidate=300';
let timeoutSpy: MockInstance<typeof AbortSignal.timeout>;
const apiPayload = {
	version: 0.6,
	generator: 'Overpass API',
	osm3s: {
		timestamp_osm_base: '2026-11-03T15:00:00Z',
		timestamp_areas_base: '2026-11-03T15:00:00Z'
	},
	elements: [{ type: 'node', id: 1, lat: 36.1, lon: 140.1, tags: { amenity: 'vending_machine' } }]
};
const liveData = {
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			properties: { amenity: 'vending_machine' },
			geometry: { type: 'Point', coordinates: [140.1, 36.1] }
		}
	]
};

function setup(options: { noCache?: boolean; backgroundWrite?: boolean } = {}) {
	const fetch = vi.fn<typeof globalThis.fetch>();
	const setHeaders = vi.fn<Parameters<typeof load>[0]['setHeaders']>();
	const cache = {
		match: vi.fn<Cache['match']>().mockResolvedValue(undefined),
		put: vi.fn<Cache['put']>().mockResolvedValue(undefined)
	};
	const writes: Promise<unknown>[] = [];
	const waitUntil = vi.fn((promise: Promise<unknown>) => writes.push(promise));
	const event = {
		fetch,
		setHeaders,
		platform: options.noCache
			? undefined
			: {
					caches: { default: cache },
					context: options.backgroundWrite ? { waitUntil } : undefined
				}
	} as unknown as Parameters<typeof load>[0];
	return { fetch, setHeaders, cache, waitUntil, writes, run: () => load(event) };
}

function cachedResponse(age: number) {
	return new Response(JSON.stringify(liveData), {
		headers: { 'X-Fetched-At': String(NOW - age) }
	});
}

beforeEach(() => {
	// Exercise the production branch even though Vitest runs through Vite's development server.
	vi.stubEnv('DEV', false);
	vi.spyOn(Date, 'now').mockReturnValue(NOW);
	// No native 25-second timers or real HTTP requests in this suite.
	timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => new AbortController().signal);
	vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected real HTTP request'));
	vi.spyOn(console, 'error').mockImplementation(() => undefined);
	vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('production vending-machine load', () => {
	it('ships a non-empty, valid Point GeoJSON fallback', () => {
		const data = v.parse(geoJSONRoot, vm);
		expect(data.features.length).toBeGreaterThan(0);
		for (const { geometry } of data.features) {
			const [lon, lat] = geometry.coordinates;
			expect(Number.isFinite(lon) && Math.abs(lon) <= 180).toBe(true);
			expect(Number.isFinite(lat) && Math.abs(lat) <= 90).toBe(true);
		}
	});

	it('returns a fresh cache without contacting either endpoint', async () => {
		const t = setup();
		t.cache.match.mockResolvedValue(cachedResponse(SIX_HOURS - 1));
		await expect(t.run()).resolves.toEqual(liveData);
		expect(t.cache.match).toHaveBeenCalledWith(CACHE_KEY);
		expect(t.fetch).not.toHaveBeenCalled();
		expect(t.setHeaders).toHaveBeenCalledWith({ 'Cache-Control': PAGE_CACHE_CONTROL });
	});

	it.each([false, true])('fetches and caches live data (waitUntil=%s)', async (backgroundWrite) => {
		const t = setup({ backgroundWrite });
		t.fetch.mockResolvedValue(Response.json(apiPayload));
		await expect(t.run()).resolves.toEqual(liveData);
		await Promise.all(t.writes);
		expect(t.fetch).toHaveBeenCalledTimes(1);
		const [url, init] = t.fetch.mock.calls[0];
		expect(url).toBe(ENDPOINTS[0]);
		expect(init).toMatchObject({
			method: 'POST',
			headers: {
				'User-Agent': 'vendmap/0.0.1 (+https://vendmap.tsukuba.dev/)',
				Referer: 'https://vendmap.tsukuba.dev/',
				Accept: 'application/json',
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		});
		if (!(init?.body instanceof URLSearchParams)) throw new Error('Expected form data');
		expect(init.body.get('data')).toContain('amenity=vending_machine');
		expect(init?.signal).toBeInstanceOf(AbortSignal);
		expect(timeoutSpy).toHaveBeenCalledWith(25_000);
		expect(t.cache.put).toHaveBeenCalledTimes(1);
		const [key, response] = t.cache.put.mock.calls[0];
		expect(key).toBe(CACHE_KEY);
		expect(response).toBeInstanceOf(Response);
		const stored = response;
		expect(await stored.json()).toEqual(liveData);
		expect(stored.headers.get('X-Fetched-At')).toBe(String(NOW));
		expect(stored.headers.get('Cache-Control')).toBe('max-age=2592000');
		expect(stored.headers.get('Content-Type')).toBe('application/json');
		expect(t.waitUntil).toHaveBeenCalledTimes(backgroundWrite ? 1 : 0);
		expect(t.setHeaders).toHaveBeenCalledWith({ 'Cache-Control': PAGE_CACHE_CONTROL });
	});

	it.each([521, 429, 503, 504])('uses the second endpoint after HTTP %s', async (status) => {
		const t = setup();
		t.fetch.mockResolvedValueOnce(new Response(null, { status }));
		t.fetch.mockResolvedValueOnce(Response.json(apiPayload));
		await expect(t.run()).resolves.toEqual(liveData);
		expect(t.fetch.mock.calls.map(([url]) => url)).toEqual(ENDPOINTS);
		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining(`HTTP ${String(status)}`),
			expect.any(Error)
		);
	});

	it('reproduces HTTP 500 after HTTP 521 and a timeout with an empty cache', async () => {
		const t = setup();
		t.fetch.mockResolvedValueOnce(new Response(null, { status: 521 }));
		t.fetch.mockRejectedValueOnce(new DOMException('Timed out', 'TimeoutError'));
		await expect(t.run()).rejects.toMatchObject({
			status: 500,
			body: {
				message: '自動販売機データの取得に失敗しました'
			}
		});
		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining('HTTP 521'),
			expect.any(Error)
		);
		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining('タイムアウト: 25秒'),
			expect.any(Error)
		);
		expect(t.cache.put).not.toHaveBeenCalled();
	});

	it('reproduces HTTP 500 when Cache API is unavailable and both APIs fail', async () => {
		const t = setup({ noCache: true });
		t.fetch.mockRejectedValue(new TypeError('fetch failed'));
		await expect(t.run()).rejects.toMatchObject({ status: 500 });
		expect(t.fetch).toHaveBeenCalledTimes(2);
	});

	it.each([SIX_HOURS, SIX_HOURS + 1])(
		'returns stale data after API failure (age=%s)',
		async (age) => {
			const t = setup();
			t.cache.match.mockResolvedValue(cachedResponse(age));
			t.fetch.mockResolvedValue(new Response(null, { status: 503 }));
			await expect(t.run()).resolves.toEqual(liveData);
			expect(t.fetch).toHaveBeenCalledTimes(2);
			expect(t.cache.put).not.toHaveBeenCalled();
			expect(t.setHeaders).toHaveBeenCalledWith({ 'Cache-Control': 'public, max-age=300' });
			expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('stale cache'));
		}
	);

	it.each([
		['broken JSON', () => new Response('<html>', { headers: { 'Content-Type': 'text/html' } })],
		['schema mismatch', () => Response.json({ elements: 'invalid' })],
		['empty data', () => Response.json({ ...apiPayload, elements: [] })],
		[
			'body timeout',
			() => {
				const response = Response.json(apiPayload);
				vi.spyOn(response, 'json').mockRejectedValue(new DOMException('Timed out', 'TimeoutError'));
				return response;
			}
		]
	])('tries the second endpoint after %s', async (_label, response) => {
		const t = setup();
		t.fetch.mockResolvedValueOnce(response());
		t.fetch.mockResolvedValueOnce(Response.json(apiPayload));
		await expect(t.run()).resolves.toEqual(liveData);
		expect(t.fetch.mock.calls.map(([url]) => url)).toEqual(ENDPOINTS);
	});

	it('continues after a cache read error', async () => {
		const t = setup();
		const failure = new Error('cache.match failed');
		t.cache.match.mockRejectedValue(failure);
		t.fetch.mockResolvedValue(Response.json(apiPayload));
		await expect(t.run()).resolves.toEqual(liveData);
		expect(console.error).toHaveBeenCalledWith('Failed to read cache:', failure);
	});

	it.each([false, true])(
		'continues after a cache write error (waitUntil=%s)',
		async (backgroundWrite) => {
			const t = setup({ backgroundWrite });
			const failure = new Error('cache.put failed');
			t.cache.put.mockRejectedValue(failure);
			t.fetch.mockResolvedValue(Response.json(apiPayload));
			await expect(t.run()).resolves.toEqual(liveData);
			await Promise.all(t.writes);
			expect(console.error).toHaveBeenCalledWith('Failed to write cache:', failure);
		}
	);

	it('keeps development mode offline and returns bundled data', async () => {
		vi.stubEnv('DEV', true);
		const t = setup();
		await expect(t.run()).resolves.toEqual(vm);
		expect(t.fetch).not.toHaveBeenCalled();
		expect(t.cache.match).not.toHaveBeenCalled();
		expect(t.setHeaders).not.toHaveBeenCalled();
	});
});
