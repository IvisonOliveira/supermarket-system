import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';

/**
 * Configuração Vite para o PDV Electron + React
 *
 * Dois processos compilados pelo vite-plugin-electron:
 *  1. main     → dist-electron/main.js     (Node.js / CommonJS)
 *  2. preload  → dist-electron/preload.js  (Node.js / CommonJS, context isolado)
 *
 * O renderer é compilado pelo Vite normal (browser) e fica em dist/.
 *
 * Em dev:  o plugin inicia o Electron automaticamente após compilar o main.
 * Em prod: `vite build` compila tudo; electron-builder empacota em seguida.
 */
export default defineConfig(({ command }) => {
  const isDev = command === 'serve';

  return {
    plugins: [
      react(),

      electron([
        // ── Processo main ─────────────────────────────────────────────────
        {
          entry: 'src/main/main.ts',
          onstart(options) {
            // Inicia o Electron quando o main é compilado (somente em dev)
            options.startup();
          },
          vite: {
            build: {
              sourcemap: isDev ? 'inline' : false,
              minify: !isDev,
              outDir: 'dist-electron',
              rollupOptions: {
                // Módulos nativos e do Electron nunca podem ser bundled
                external: [
                  'electron',
                  'better-sqlite3',
                  'serialport',
                  '@serialport/bindings-cpp',
                  'electron-store',
                ],
              },
            },
          },
        },

        // ── Preload ────────────────────────────────────────────────────────
        {
          entry: 'src/main/preload.ts',
          onstart(options) {
            // Recarrega apenas o renderer quando o preload muda (mais rápido que restart)
            options.reload();
          },
          vite: {
            build: {
              sourcemap: isDev ? 'inline' : false,
              minify: false, // preload deve ser legível para debug de CSP
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron'],
              },
            },
          },
        },
      ]),

      // Permite ao renderer usar módulos Node.js como `path`, `os` (polyfills)
      renderer(),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/renderer'),
        '@shared': path.resolve(__dirname, './src/shared'),
      },
    },

    server: {
      port: 5174,
      strictPort: true, // falha se porta estiver ocupada, evita Electron apontar para porta errada
    },

    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
      },
    },
  };
});
