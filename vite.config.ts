import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'
import eslint from 'vite-plugin-eslint'
import react from '@vitejs/plugin-react-swc'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      eslint(),
      createHtmlPlugin({
        // HTML Template 설정
        minify: false,
        entry: 'src/main.tsx',
        template: 'index.html',
        inject: { data: { title: env.VITE_TITLE } },
      }),
    ],
    resolve: { alias: [{ find: '@', replacement: path.resolve(__dirname, 'src') }] },
  }
})
