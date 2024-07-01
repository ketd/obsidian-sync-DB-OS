const path = require('path');
const builtins = require("builtin-modules");

module.exports = {
	mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
	entry: './src/main.ts',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'main.js',
	},
	target: 'electron-renderer', // 如果是 Electron 主进程，请改为 'electron-main'
	externals: [
		'obsidian',
		'electron',
		/^@codemirror\/(autocomplete|collab|commands|language|lint|search|state|view)/,
		/^@lezer\/(common|highlight|lr)/,
		...builtins, // 原来的 externalModules
	],
	resolve: {
		alias: {
			'punycode': 'punycode',
		},
		extensions: ['.ts', '.js'],
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	devtool: process.env.NODE_ENV === 'production' ? false : 'inline-source-map',
	devServer: {
		contentBase: './dist',
		hot: true,
	},
};
