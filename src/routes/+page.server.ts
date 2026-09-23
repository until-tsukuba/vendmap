import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { payload, type OSMObject } from '$lib/overpass';
import * as v from 'valibot';
import vm from '$lib/assets/vm.json';
import { version } from '../../package.json';

type PointCollection = GeoJSON.FeatureCollection<GeoJSON.Point>;

const REQUEST_HEADERS = {
	'User-Agent': `vendmap/${version} (+https://vendmap.tsukuba.dev/)`,
	Referer: 'https://vendmap.tsukuba.dev/',
	Accept: 'application/json'
};
// https://wiki.openstreetmap.org/wiki/Overpass_API
const OVERPASS_ENDPOINTS = [
	'https://overpass-api.de/api/interpreter',
	'https://overpass.private.coffee/api/interpreter'
];
const TIMEOUT_MS = 25_000;

// Overpass への問い合わせ回数を抑えるため取得結果を Cache API に保存する。
// FRESH_MS を過ぎたら再取得を試み、失敗したときは STALE_S まで古い結果を使う
const CACHE_KEY = 'https://vendmap.tsukuba.dev/__cache/overpass/vending-machines';
const FETCHED_AT_HEADER = 'X-Fetched-At';
const FRESH_MS = 6 * 60 * 60 * 1000;
const STALE_S = 30 * 24 * 60 * 60;

const PAGE_CACHE_CONTROL = 'max-age=43200, public, s-maxage=300, stale-while-revalidate=300';

const query = `[out:json][timeout:25];
way(id:183555030);
map_to_area-> .ulis;
way(id:183555029);
map_to_area -> .ut;
(
  node(area.ulis)[amenity=vending_machine];
  node(area.ut)[amenity=vending_machine];
);
out;`;

const makeGeoJSON = (nodes: OSMObject[]): PointCollection => {
	const features = nodes.map((elem: OSMObject): GeoJSON.Feature<GeoJSON.Point> => {
		return {
			type: 'Feature',
			properties: Object.keys(elem.tags).reduce<Record<string, string>>((acc, key) => {
				acc[key] = elem.tags[key];
				return acc;
			}, {}),
			geometry: {
				coordinates: [elem.lon, elem.lat],
				type: 'Point'
			}
		};
	});
	return {
		type: 'FeatureCollection',
		features: features
	} satisfies PointCollection;
};

// 利用者に表示する取得失敗の理由
class OverpassFailure extends Error {}

const HTTP_STATUS_HINTS: Record<number, string> = {
	406: 'リクエストが拒否されました',
	429: 'リクエストが多すぎるため制限されています',
	502: 'サーバーが不正な応答を返しました',
	503: 'サーバーが一時的に利用できません',
	504: 'サーバーが混雑しているか、処理が時間切れになりました'
};

const isTimeout = (e: unknown): boolean => e instanceof Error && e.name === 'TimeoutError';

const timeoutFailure = (e: unknown): OverpassFailure =>
	new OverpassFailure(
		`タイムアウト: ${String(TIMEOUT_MS / 1000)}秒以内に応答が完了しませんでした`,
		{ cause: e }
	);

const describeNetworkError = (e: unknown): string => {
	if (!(e instanceof Error)) return String(e);
	const cause: unknown = e.cause;
	if (cause instanceof Error) {
		const code = 'code' in cause && typeof cause.code === 'string' ? cause.code : cause.name;
		return `${e.message}: ${code}`;
	}
	return e.message;
};

const fetchOverpass = async (fetch: typeof globalThis.fetch, url: string): Promise<OSMObject[]> => {
	let resp: Response;
	try {
		resp = await fetch(url, {
			method: 'POST',
			headers: { ...REQUEST_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ data: query }),
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
	} catch (e) {
		if (isTimeout(e)) throw timeoutFailure(e);
		throw new OverpassFailure(
			`接続失敗: サーバーに接続できませんでした (${describeNetworkError(e)})`,
			{
				cause: e
			}
		);
	}

	if (!resp.ok) {
		const hint =
			HTTP_STATUS_HINTS[resp.status] ?? (resp.status >= 500 ? 'サーバー側のエラーです' : '');
		const status = [`HTTP ${String(resp.status)}`, resp.statusText].filter(Boolean).join(' ');
		throw new OverpassFailure(hint ? `${status}: ${hint}` : status);
	}

	let body: unknown;
	try {
		body = await resp.json();
	} catch (e) {
		if (isTimeout(e)) throw timeoutFailure(e);
		throw new OverpassFailure(
			`不正な応答: JSON として解釈できませんでした (Content-Type: ${resp.headers.get('Content-Type') ?? '不明'})`,
			{ cause: e }
		);
	}

	const json = v.safeParse(payload, body);
	if (!json.success) {
		const issue = json.issues[0];
		throw new OverpassFailure(
			`不正な応答: データの形式が想定と異なります (${v.getDotPath(issue) ?? '(root)'}: ${issue.message})`
		);
	}
	if (json.output.elements.length === 0) {
		const remark = json.output.remark;
		throw new OverpassFailure(
			`データが0件でした${remark ? ` (情報取得元からの通知: ${remark})` : ''}`
		);
	}
	return json.output.elements;
};

const readCache = async (
	cache: Cache | undefined
): Promise<{ data: PointCollection; fresh: boolean } | undefined> => {
	try {
		const resp = await cache?.match(CACHE_KEY);
		if (!resp) return undefined;
		const fetchedAt = Number(resp.headers.get(FETCHED_AT_HEADER));
		return {
			data: (await resp.json()) as PointCollection,
			fresh: Date.now() - fetchedAt < FRESH_MS
		};
	} catch (e) {
		console.error('Failed to read cache:', e);
		return undefined;
	}
};

const writeCache = async (cache: Cache | undefined, data: PointCollection): Promise<void> => {
	try {
		await cache?.put(
			CACHE_KEY,
			new Response(JSON.stringify(data), {
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': `max-age=${String(STALE_S)}`,
					[FETCHED_AT_HEADER]: String(Date.now())
				}
			})
		);
	} catch (e) {
		console.error('Failed to write cache:', e);
	}
};

export const load = (async ({ fetch, setHeaders, platform }): Promise<PointCollection> => {
	if (import.meta.env.DEV) return vm as PointCollection;

	const cache = platform?.caches?.default;
	const cached = await readCache(cache);
	if (cached?.fresh) {
		setHeaders({ 'Cache-Control': PAGE_CACHE_CONTROL });
		return cached.data;
	}

	const failures: App.FetchFailure[] = [];
	for (const url of OVERPASS_ENDPOINTS) {
		try {
			const data = makeGeoJSON(await fetchOverpass(fetch, url));
			const write = writeCache(cache, data);
			if (platform?.context) platform.context.waitUntil(write);
			else await write;
			setHeaders({ 'Cache-Control': PAGE_CACHE_CONTROL });
			return data;
		} catch (e) {
			const reason = e instanceof OverpassFailure ? e.message : `予期しないエラー: ${String(e)}`;
			failures.push({ source: new URL(url).host, reason });
			console.error(`Overpass API request to ${url} failed: ${reason}`, e);
		}
	}

	// すべてのエンドポイントで失敗した場合は古いキャッシュで表示を継続し、なければエラーにする
	if (cached) {
		console.warn('Serving stale cache because all Overpass API requests failed');
		setHeaders({ 'Cache-Control': 'public, max-age=300' });
		return cached.data;
	}
	error(500, {
		message: '自動販売機データの取得に失敗しました',
		failures
	});
}) satisfies PageServerLoad;
