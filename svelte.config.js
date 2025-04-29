import adapter from '@sveltejs/adapter-static';

const dev = process.argv.includes('dev');
const repoName = "tarefa-4-netflix-trends";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ fallback: '404.html' }),

		paths: {
			base: dev ? '' : `/${repoName}`,
		},
	},
};

export default config;