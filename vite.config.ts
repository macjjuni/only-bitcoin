import path from "path";
import { defineConfig, loadEnv, PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import { createHtmlPlugin } from "vite-plugin-html";
import eslint from "vite-plugin-eslint";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }: { mode: string }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return defineConfig({
    plugins: [
      react(),
      eslint(),
      visualizer({
        emitFile: true,
        filename: "stats.html",
        open: true,
        gzipSize: true,
        brotliSize: true
      }) as unknown as PluginOption,
      createHtmlPlugin({
        // HTML Template 설정
        minify: false,
        template: "index.html",
        inject: { data: { title: env.VITE_TITLE, url: env.VITE_URL } }
      }),
    ],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: "@import \"@/styles/variable\";\n" +
            "@import \"@/styles/fonts\";\n" +
            "@import \"@/styles/reset\";\n" +
            "@import \"@/styles/mixin\";\n" +
            "@import \"@/styles/animate\";"
        }
      }

    },
    build: {
      minify: "terser",
      terserOptions: {
        compress: { drop_console: true, drop_debugger: true }
      }
    },
    resolve: { alias: [{ find: "@", replacement: path.resolve(__dirname, "src") }] }
  });
});
