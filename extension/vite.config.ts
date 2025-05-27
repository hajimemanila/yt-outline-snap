import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs-extra';
import { writeFileSync, existsSync } from 'fs';

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    // If 'process is not defined' persists for other reasons,
    // we might need to define 'process.env' more broadly:
    // 'process.env': JSON.stringify({}), 
  },
  plugins: [
    react(),
    {
      name: 'chrome-extension',
      enforce: 'post',
      closeBundle: async () => {
        try {
          // Copy options.html to dist
          await fs.copy(resolve(__dirname, 'src/options.html'), resolve(__dirname, 'dist/options.html'));
          console.log('Copied options.html to dist');
          
          // Copy manifest.json to dist
          await fs.copy(resolve(__dirname, 'src/manifest.json'), resolve(__dirname, 'dist/manifest.json'));
          console.log('Copied manifest.json to dist');
          
          // Copy icons
          if (fs.existsSync(resolve(__dirname, 'src/icons'))) {
            await fs.copy(resolve(__dirname, 'src/icons'), resolve(__dirname, 'dist/icons'));
            console.log('Copied icons to dist');
          }
          
          // Copy _locales
          if (fs.existsSync(resolve(__dirname, 'public/_locales'))) {
            await fs.copy(resolve(__dirname, 'public/_locales'), resolve(__dirname, 'dist/_locales'));
            console.log('Copied _locales to dist');
          }
          

        } catch (error) {
          console.error('Error in chrome-extension plugin:', error);
        }
      }
    }
  ],
  css: {
    postcss: {
      plugins: [require('tailwindcss'), require('autoprefixer')],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true, // Enabled for debugging content script errors
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
    lib: {
      // contentScriptのみをエントリーポイントとして指定
      entry: resolve(__dirname, 'src/contentScript.tsx'),
      name: 'contentScript',
      formats: ['iife'],
      fileName: () => 'contentScript.js'
    },
    rollupOptions: {
      output: {
        assetFileNames: (info) => {
          if (info.name?.endsWith('.css')) {
            return '[name].[ext]';
          }
          return 'assets/[name]-[hash].[ext]';
        }
      }
    }
  },
});
