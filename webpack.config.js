const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

module.exports = {
	entry: 'src/main.ts', // 入口文件路径，根据你的项目实际路径进行调整
	output: {
		path: path.resolve(__dirname, 'dist'), // 输出目录
		filename: 'main.js', // 输出文件名
	},
	resolve: {
		extensions: ['.ts', '.js'], // 支持的文件扩展名
	},
	module: {
		rules: [
			{
				test: /\.ts$/, // 匹配 .ts 文件
				use: 'ts-loader', // 使用 ts-loader 处理 TypeScript 文件
				exclude: /node_modules/, // 排除 node_modules 目录
			},
		],
	},
	// 可选配置：排除 Node.js 核心模块和 node_modules
	externals: [
		nodeExternals(), // 排除 Node.js 核心模块
		// 其他需要排除的模块
		{
			'obsidian': 'obsidian',
			'electron': 'electron',
			// 其他外部依赖
		}
	],
	// 可选配置：定义全局变量或别名
	plugins: [
		new webpack.ProvidePlugin({
			punycode: 'punycode',
			// 其他全局变量
		}),
	],
	mode: prod ? 'production' : 'development',
	devtool: prod ? false : 'inline-source-map',
};
