// options.tsx用のビルドスクリプト
const { build } = require('vite');
const { resolve } = require('path');

async function buildOptions() {
  try {
    await build({
      define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
        // If 'process is not defined' persists for other reasons,
        // we might need to define 'process.env' more broadly:
        // 'process.env': JSON.stringify({}), 
      },
      configFile: false,
      root: resolve(__dirname, '..'),
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        sourcemap: false,
        lib: {
          entry: resolve(__dirname, '../src/options.tsx'),
          name: 'options',
          formats: ['iife'],
          fileName: () => 'options'
        },
        rollupOptions: {
          output: {
            entryFileNames: 'options.js',
            assetFileNames: (assetInfo) => {
              if (assetInfo.name === 'style.css') {
                return 'options.css';
              }
              return 'assets/[name]-[hash].[ext]';
            }
          }
        }
      }
    });
    console.log('Options page built successfully');
  } catch (error) {
    console.error('Error building options page:', error);
  }
}

buildOptions();
