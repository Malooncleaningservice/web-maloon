import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			// adapter-node for Railway / any Node.js host
			adapter: adapter()
			// Note: max request body size is controlled at runtime by the
			// BODY_SIZE_LIMIT env var, read directly by adapter-node's
			// handler.js (default 512K) — not configurable here.
		})
	]
});
