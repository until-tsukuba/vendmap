// Overpass API から筑波大学構内の自動販売機を取得し、src/lib/assets/vm.json を更新する。
// 使い方: node scripts/update-vm.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUTPUT = fileURLToPath(new URL('../src/lib/assets/vm.json', import.meta.url));
const { version } = JSON.parse(
	await readFile(new URL('../package.json', import.meta.url), 'utf-8')
);

const HEADERS = {
	'User-Agent': `vendmap/${version} (+https://vendmap.tsukuba.dev/)`,
	Referer: 'https://vendmap.tsukuba.dev/',
	Accept: 'application/json',
	'Content-Type': 'application/x-www-form-urlencoded'
};
// https://wiki.openstreetmap.org/wiki/Overpass_API
const ENDPOINTS = [
	'https://overpass-api.de/api/interpreter',
	'https://overpass.private.coffee/api/interpreter'
];
// 混雑時は 30 秒以上かかることがあるため、サーバー側よりクライアント側を長くとる
const QUERY_TIMEOUT_S = 90;
const FETCH_TIMEOUT_MS = 120_000;
const ATTEMPTS = 3;
const RETRY_WAIT_MS = 30_000;
// 取得結果が異常に少ないときに誤って上書きしないための下限(現在は 70 件前後)
const MIN_FEATURES = 40;

const query = `[out:json][timeout:${String(QUERY_TIMEOUT_S)}];
way(id:183555030);
map_to_area-> .ulis;
way(id:183555029);
map_to_area -> .ut;
(
  node(area.ulis)[amenity=vending_machine];
  node(area.ut)[amenity=vending_machine];
);
out;`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchElements = async (url) => {
	const resp = await fetch(url, {
		method: 'POST',
		headers: HEADERS,
		body: new URLSearchParams({ data: query }),
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
	});
	if (!resp.ok) throw new Error(`HTTP ${String(resp.status)} ${resp.statusText}`);
	const json = await resp.json();
	if (!Array.isArray(json.elements)) throw new Error('elements がありません');
	// Overpass はタイムアウト時でも 200 で途中までの結果と remark を返すことがある
	if (json.remark) throw new Error(`Overpass からの通知: ${json.remark}`);
	return json.elements;
};

const fetchWithRetry = async () => {
	for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
		for (const url of ENDPOINTS) {
			const host = new URL(url).host;
			const startedAt = Date.now();
			try {
				const elements = await fetchElements(url);
				console.log(`${host}: ${String(elements.length)} 件 (${String(Date.now() - startedAt)}ms)`);
				return elements;
			} catch (e) {
				console.warn(`[${String(attempt)}/${String(ATTEMPTS)}] ${host}: ${String(e)}`);
			}
		}
		if (attempt < ATTEMPTS) await sleep(RETRY_WAIT_MS);
	}
	throw new Error('すべてのエンドポイントで取得に失敗しました');
};

const elements = (await fetchWithRetry()).filter((elem) => elem.type === 'node');
// 差分が安定するよう OSM の ID 順に並べる
elements.sort((a, b) => a.id - b.id);

const features = elements.map((elem) => ({
	type: 'Feature',
	properties: { ...elem.tags },
	geometry: { coordinates: [elem.lon, elem.lat], type: 'Point' }
}));
if (features.length < MIN_FEATURES) {
	throw new Error(`取得件数が少なすぎます (${String(features.length)} 件)。更新を中止します`);
}

// 整形は prettier に任せる(CI では更新後に prettier --write を実行する)
await writeFile(OUTPUT, JSON.stringify({ type: 'FeatureCollection', features }, null, '\t') + '\n');
console.log(`${OUTPUT} を ${String(features.length)} 件で更新しました`);
