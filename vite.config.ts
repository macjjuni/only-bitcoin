import path from "path";
import { defineConfig, loadEnv } from "vite";
import { createHtmlPlugin } from "vite-plugin-html";
import eslint from "vite-plugin-eslint";
import react from "@vitejs/plugin-react-swc";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      eslint(),
      createHtmlPlugin({
        // HTML Template 설정
        minify: false,
        entry: "src/main.tsx",
        template: "index.html",
        inject: { data: { title: env.VITE_TITLE, url: env.VITE_URL } }
      })
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
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    },
    resolve: { alias: [{ find: "@", replacement: path.resolve(__dirname, "src") }] }
  };
});
