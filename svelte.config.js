import adapter from '@sveltejs/adapter-cloudflare';
import { relative, sep } from 'node:path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// defaults to rune mode for the project, execept for `node_modules`. Can be removed in svelte 6.
		runes: ({ filename }) => {
			const relativePath = relative(import.meta.dirname, filename);
			const pathSegments = relativePath.toLowerCase().split(sep);
			const isExternalLibrary = pathSegments.includes('node_modules');

			return isExternalLibrary ? undefined : true;
		}
	},
	kit: {
		adapter: adapter(),
		// 生产构建（如 wrangler）下会校验 multipart/form 的 Origin；Expo / 局域网 IP 与 API 主机不一致或缺少 Origin 会 403。
		// 移动端使用 Bearer；浏览器仍依赖 better-auth 会话与同源策略。
		csrf: { trustedOrigins: ['*'] }
	}
};

export default config;
