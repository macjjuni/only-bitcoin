import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { createHtmlPlugin } from "vite-plugin-html";
import eslint from "vite-plugin-eslint";
import { compression } from "vite-plugin-compression2";
import { readFileSync } from 'fs';
// import { visualizer } from "rollup-plugin-visualizer";

const {version} = JSON.parse(readFileSync('./package.json', 'utf-8'));


export default defineConfig(({ mode }: { mode: string }) => {

  const env = loadEnv(mode, process.cwd(), "");

  env.VITE_VERSION = `v${version}`;

  return defineConfig({
    plugins: [
      react(),
      eslint(),
      compression(),
      // visualizer({
      //   emitFile: true,
      //   filename: "stats.html",
      //   open: true,
      //   gzipSize: true,
      //   template: "treemap", // 그래프 유형: treemap, sunburst, network, pie, graph 등
      // }) as unknown as PluginOption,
      createHtmlPlugin({
        // HTML Template 설정
        minify: false,
        template: "index.html",
        inject: { data: { title: env.VITE_TITLE, url: env.VITE_URL } }
      }),
    ],
    build: {
      minify: "terser",
      terserOptions: {
        compress: { drop_console: true, drop_debugger: true }
      }
    },
    resolve: { alias: [{ find: "@", replacement: path.resolve(__dirname, "src") }] },
    define: { 'import.meta.env.VITE_VERSION': JSON.stringify(env.VITE_VERSION) }
  });
});
