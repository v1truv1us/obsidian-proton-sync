import esbuild from "esbuild";
import process from "process";

const prod = (process.argv[2] === 'production');

const context = await esbuild.context({
	banner: {
		js: "",
	},
	entryPoints: ['src/main.ts'],
	bundle: true,
	external: [
		'obsidian',
		'@codemirror/*',
		'@lezer/*',
	],
	format: 'cjs',
	target: 'es2020',
	logLevel: "info",
	sourcemap: prod ? false : 'inline',
	treeShaking: true,
	outfile: 'main.js',
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
