/// <reference types="vitest/config" />
import adapterAuto from '@sveltejs/adapter-auto';
import adapterStatic from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const staticBuild = !!(globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.STATIC;

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: staticBuild ? adapterStatic({ fallback: 'index.html' }) : adapterAuto(),
			// `STATIC=1 npm run build` makes a self-contained build in /build that works from any folder,
			// for example to try the app on a phone without a server of your own.
			...(staticBuild ? { router: { type: 'hash' as const }, paths: { relative: true }, appDir: 'app' } : {})
		})
	],
	test: {
		include: ['src/**/*.test.ts']
	}
});
