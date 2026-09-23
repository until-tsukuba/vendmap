// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
	// interface Locals {}
	// interface PageData {}
	interface FetchFailure {
		source: string;
		reason: string;
	}
	interface Error {
		message: string;
		failures?: FetchFailure[];
	}
	interface Platform {
		caches?: CacheStorage & { default: Cache };
		context?: { waitUntil(promise: Promise<unknown>): void };
	}
}
