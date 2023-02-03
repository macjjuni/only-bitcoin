import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'
import eslint from 'vite-plugin-eslint'
import react from '@vitejs/plugin-react-swc'
// import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      eslint(),
      // HTML Template 설정
      createHtmlPlugin({
        minify: false,
        entry: 'src/main.tsx',
        template: 'index.html',
        inject: {
          data: {
            title: env.VITE_TITLE,
          },
        },
      }),
    ],
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, 'src') },
        { find: '@api', replacement: path.resolve(__dirname, 'src/api') },
        { find: '@components', replacement: path.resolve(__dirname, 'src/components') },
        { find: '@hoc', replacement: path.resolve(__dirname, 'src/hoc') },
        { find: '@hooks', replacement: path.resolve(__dirname, 'src/hooks') },
        { find: '@layout', replacement: path.resolve(__dirname, 'src/layout') },
        { find: '@pages', replacement: path.resolve(__dirname, 'src/pages') },
        { find: '@router', replacement: path.resolve(__dirname, 'src/router') },
        { find: '@styles', replacement: path.resolve(__dirname, 'src/styles') },
        { find: '@utils', replacement: path.resolve(__dirname, 'src/utils') },
      ],
    },
  }
})
