// pdfjs-dist 使用 .mjs；Metro 默认需显式列入 sourceExts
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

if (!config.resolver.sourceExts.includes('mjs')) {
	config.resolver.sourceExts.push('mjs');
}

module.exports = config;
