import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  // Copy assets folder to dist during build
  plugins: [{
    name: 'copy-assets',
    closeBundle() {
      const assetsDir = resolve(__dirname, 'assets');
      const distAssetsDir = resolve(__dirname, 'dist/assets');
      
      try {
        mkdirSync(distAssetsDir, { recursive: true });
        const files = readdirSync(assetsDir);
        
        files.forEach(file => {
          copyFileSync(
            resolve(assetsDir, file),
            resolve(distAssetsDir, file)
          );
          console.log(`✓ Copied: ${file}`);
        });
        
        console.log('✓ Assets copied to dist/assets/');
      } catch (error) {
        console.error('Error copying assets:', error);
      }
    }
  }]
});

