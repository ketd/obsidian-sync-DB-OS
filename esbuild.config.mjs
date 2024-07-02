import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import { resolve } from "path";

const banner =
	`/*
这是ESBUILD生成/捆绑的文件
如果您想查看源代码，请访问此插件的 GitHub 仓库
*/
`;

const prod = (process.argv[2] === "production");

// 使用 resolve 来获取 'events' 模块的路径
const eventsPath = resolve('node_modules/events/');

const context = await esbuild.context({
	banner: {
		js: banner,
	},
	entryPoints: ["./src/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtins
	],
	alias: {
		'events': eventsPath,
		'punycode': 'punycode'
	},
	define:{
		global: 'globalThis'
	},
	format: "cjs",
	target: "es2020",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	outfile: "main.js",
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
