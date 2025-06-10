// background.ts用のビルドスクリプト
const { build } = require('vite');
const { resolve } = require('path');

async function buildBackground() {
  try {
    await build({
      configFile: false,
      root: resolve(__dirname, '..'),
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        sourcemap: false,
        lib: {
          entry: resolve(__dirname, '../src/background.ts'),
          name: 'background',
          formats: ['es'],
          fileName: () => 'background'
        },
        rollupOptions: {
          output: {
            entryFileNames: 'background.js'
          }
        }
      }
    });
    console.log('Background script built successfully');
  } catch (error) {
    console.error('Error building background script:', error);
  }
}

buildBackground();
