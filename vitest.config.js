import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Test the server load directly, without starting the Cloudflare adapter or contacting Overpass.
export default defineConfig({
	resolve: {
		alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) }
	},
	test: {
		environment: 'node',
		restoreMocks: true,
		unstubEnvs: true
	}
});
