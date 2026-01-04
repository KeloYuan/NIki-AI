import esbuild from "esbuild";

const isDev = process.argv.includes("dev");

const buildOptions = {
  entryPoints: ["main.ts"],
  bundle: true,
  outfile: "main.js",
  platform: "node",
  target: "es2018",
  format: "cjs",
  sourcemap: isDev,
  external: ["obsidian"],
};

if (isDev) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(buildOptions);
}
