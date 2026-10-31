/// <reference types="vitest/config" />
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

			// The app runs in the browser only, so it is a set of static files with one page for every address
			// (`fallback`): any static host serves it (Vercel, Netlify, Cloudflare Pages). See vercel.json and netlify.toml.
			adapter: adapterStatic({ fallback: 'index.html' }),
			// `STATIC=1 npm run build` makes a self-contained build in /build that works from any folder,
			// for example to try the app on a phone without a server of your own.
			...(staticBuild ? { router: { type: 'hash' as const }, paths: { relative: true }, appDir: 'app' } : {})
		})
	],
	test: {
		include: ['src/**/*.test.ts']
	}
});
